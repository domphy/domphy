// DomphyPress markdown pipeline: turns a VitePress-flavoured markdown file into
// a Domphy element tree plus the metadata the build/layout need (frontmatter,
// table of contents, interactive islands, resolved title).
//
// Design: we run our OWN `markdown-it` instance configured with the VitePress
// extensions (containers, includes, code imports) and feed its token stream to
// `@domphy/markdown`'s canonical `tokensToDomphy` walker. The walker reads
// TOKENS (not markdown-it's HTML renderer), so every extension is implemented by
// shaping tokens — never by emitting HTML strings the walker would not see.
//
// Vue-specific authoring constructs (`<script setup>`, `<CodeEditor>`,
// `<DomphyPreview>`) are handled with a source pre-pass before markdown-it runs:
// imports are collected into a local-name -> specifier map, the script block is
// stripped, and each widget tag is swapped for a placeholder div that carries a
// `data-island` id while the demo module reference is recorded as an `IslandRef`.

import { readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import type { DomphyElement } from "@domphy/core";
import {
  type MarkdownItToken,
  splitFrontmatter,
  tokensToDomphy,
} from "@domphy/markdown";
import MarkdownIt from "markdown-it";
import container from "markdown-it-container";
// `markdown-it-include` ships no type declarations and has no `@types` package,
// so the import is untyped; we immediately give it a precise markdown-it plugin
// type below. The directive scopes the "no declaration file" error to this one
// third-party import without an ambient module file.
// @ts-expect-error -- no type declarations for markdown-it-include
import includeUntyped from "markdown-it-include";
import type {
  IslandRef,
  RenderDocOptions,
  RenderedDoc,
  TocEntry,
} from "./types.js";

/** markdown-it core ruler state — `state.tokens` is the live token array. */
type CoreState = { tokens: MarkdownItToken[] };

const include = includeUntyped as MarkdownIt.PluginWithOptions<{
  root: string;
}>;

export type { IslandRef, RenderDocOptions, RenderedDoc } from "./types.js";

// --- <script setup> import parsing ------------------------------------------

/** A single default import collected from a `<script setup>` block. */
interface ImportEntry {
  /** The bare specifier as written, e.g. "../../demos/patches/Button.ts?raw". */
  specifier: string;
  /** Whether the import carried a `?raw` suffix (Vite raw-text import). */
  raw: boolean;
}

/** Maps a `<script setup>` local default-import name to its source specifier. */
type ImportMap = Map<string, ImportEntry>;

const SCRIPT_BLOCK_PATTERN = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
// Default import: `import Name from "specifier"`. Named/side-effect imports are
// ignored because only default imports back the widget tags.
const DEFAULT_IMPORT_PATTERN =
  /import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']/g;

/**
 * Extracts default imports from every `<script setup>` block into a map and
 * returns the source with those blocks removed. Non-default imports are skipped.
 */
function extractScriptImports(source: string): {
  imports: ImportMap;
  body: string;
} {
  const imports: ImportMap = new Map();

  let match: RegExpExecArray | null;
  SCRIPT_BLOCK_PATTERN.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
  while ((match = SCRIPT_BLOCK_PATTERN.exec(source)) !== null) {
    const scriptBody = match[1];
    let importMatch: RegExpExecArray | null;
    DEFAULT_IMPORT_PATTERN.lastIndex = 0;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex iteration
    while ((importMatch = DEFAULT_IMPORT_PATTERN.exec(scriptBody)) !== null) {
      const localName = importMatch[1];
      const rawSpecifier = importMatch[2];
      const raw = rawSpecifier.endsWith("?raw");
      const specifier = raw
        ? rawSpecifier.slice(0, -"?raw".length)
        : rawSpecifier;
      imports.set(localName, { specifier, raw });
    }
  }

  const body = source.replace(SCRIPT_BLOCK_PATTERN, "").replace(/^\s*\n/, "");
  return { imports, body };
}

// --- Specifier resolution ----------------------------------------------------

/**
 * Resolves a module/file specifier written inside a markdown file to an absolute
 * path.
 *
 * `@/` maps to the site (app) root — the parent of the docs directory — matching
 * VitePress, where `@` is the Vite project root and authors write paths like
 * `@/docs/demos/core/counting.ts`. Everything else is relative to the markdown
 * file's directory (which is allowed to reach up into `packages/`). The `?raw`
 * suffix, if present, is stripped before resolution.
 */
function resolveSpecifier(
  specifier: string,
  fileDir: string,
  docsDir: string,
): string {
  let target = specifier;
  if (target.endsWith("?raw")) target = target.slice(0, -"?raw".length);

  if (target.startsWith("@/")) {
    // `@` is the app root (parent of docsDir), so `@/docs/...` points back into
    // the docs tree at `<appRoot>/docs/...`.
    const appRoot = dirname(docsDir);
    return resolve(appRoot, target.slice("@/".length));
  }
  if (isAbsolute(target)) return target;
  return resolve(fileDir, target);
}

// --- Widget tag -> island placeholder ----------------------------------------

// `<CodeEditor :code="Var" ... />` and `<DomphyPreview :element="Var" ... />`
// are self-closing. The attribute order is free, so we capture the whole tag and
// pull the bound variable out of the attribute string separately.
const CODE_BIND_PATTERN = /:code\s*=\s*"([^"]+)"/;
const ELEMENT_BIND_PATTERN = /:element\s*=\s*"([^"]+)"/;

/**
 * Replaces every `<CodeEditor>`/`<DomphyPreview>` tag with a placeholder div
 * (`{ div: "", dataIsland: id }`, serialized as an HTML block so markdown-it
 * passes it straight through to the walker) and records an `IslandRef` for each.
 * Ids are deterministic per page: `island-0`, `island-1`, ... in document order.
 */
function extractIslands(
  body: string,
  imports: ImportMap,
  fileDir: string,
  docsDir: string,
): { body: string; islands: IslandRef[] } {
  const islands: IslandRef[] = [];

  const placeholder = (id: string): string => `<div data-island="${id}"></div>`;

  const resolveLocal = (localName: string): string | null => {
    const entry = imports.get(localName);
    if (!entry) return null;
    return resolveSpecifier(entry.specifier, fileDir, docsDir);
  };

  // Single combined scan so island ids follow document order regardless of
  // whether a page mixes editors and previews.
  const TAG_PATTERN = /<(CodeEditor|DomphyPreview)\b([^>]*?)\/>/g;

  const next = body.replace(
    TAG_PATTERN,
    (whole, tagName: string, attributes: string) => {
      if (tagName === "CodeEditor") {
        const bind = CODE_BIND_PATTERN.exec(attributes);
        if (!bind) return whole;
        const source = resolveLocal(bind[1]);
        if (!source) return whole;
        const id = `island-${islands.length}`;
        islands.push({ id, kind: "editor", source });
        return placeholder(id);
      }
      // DomphyPreview
      const bind = ELEMENT_BIND_PATTERN.exec(attributes);
      if (!bind) return whole;
      const source = resolveLocal(bind[1]);
      if (!source) return whole;
      const id = `island-${islands.length}`;
      islands.push({ id, kind: "preview", source, exportName: "default" });
      return placeholder(id);
    },
  );

  return { body: next, islands };
}

// Recognizes a placeholder produced by `extractIslands` once it has passed
// through markdown-it as an `html_block`: a div whose only content is the
// `<div data-island="...">` marker.
const PLACEHOLDER_CONTENT_PATTERN =
  /^<div\s+data-island="([^"]+)"\s*>\s*<\/div>$/;

/**
 * Normalizes island placeholders in the produced Domphy tree. The walker turns
 * the placeholder `html_block` into `{ div: "<div data-island=\"id\"></div>" }`;
 * this rewrites those nodes in place to the canonical `{ div: "", dataIsland:
 * id }` element shape the island contract expects, so the build can match a
 * placeholder DOM node to its `IslandRef` by `data-island` id.
 */
function normalizeIslandPlaceholders(nodes: DomphyElement[]): void {
  const visit = (list: unknown[]): void => {
    for (const node of list) {
      if (!node || typeof node !== "object" || Array.isArray(node)) continue;
      const element = node as Record<string, unknown>;
      const divContent = element.div;
      if (typeof divContent === "string") {
        const match = PLACEHOLDER_CONTENT_PATTERN.exec(divContent.trim());
        if (match) {
          element.div = "";
          element.dataIsland = match[1];
          continue;
        }
      }
      // Recurse into array/element children of any element key.
      for (const value of Object.values(element)) {
        if (Array.isArray(value)) visit(value);
        else if (value && typeof value === "object") visit([value]);
      }
    }
  };
  visit(nodes);
}

// --- `<<<` code import (VitePress "import-code" snippet) ---------------------

// `<<< path` or `<<< path [label]`. Region/line-range markers (`{1,4}`, `#region`)
// are out of scope for the docs in this repo, so the full file is imported.
const CODE_IMPORT_PATTERN = /^<<<\s+(\S+?)(?:\s+\[([^\]]*)\])?\s*$/gm;

// Maps a file extension to a fenced-code language so the highlighter recognizes
// the imported snippet. Unknown extensions fall back to no language.
const EXTENSION_LANGUAGE: Record<string, string> = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "js",
  ".cjs": "js",
  ".json": "json",
  ".css": "css",
  ".html": "html",
  ".vue": "vue",
  ".md": "markdown",
  ".sh": "bash",
  ".bash": "bash",
  ".yml": "yaml",
  ".yaml": "yaml",
};

/**
 * Expands `<<< path [label]` directives into fenced code blocks containing the
 * referenced file's contents, routed through markdown-it's normal fence path so
 * the configured highlighter runs. `@/` maps to the docs root; other paths are
 * relative to the markdown file's directory and may reach into `packages/`.
 */
function expandCodeImports(
  body: string,
  fileDir: string,
  docsDir: string,
): string {
  return body.replace(
    CODE_IMPORT_PATTERN,
    (_whole, rawPath: string, label: string | undefined) => {
      const absolute = resolveSpecifier(rawPath, fileDir, docsDir);
      const fence = "```";
      let contents: string;
      try {
        contents = readFileSync(absolute, "utf8");
      } catch {
        // Missing target: leave a visible fenced note instead of crashing the
        // whole page render.
        return [fence, `Could not import: ${rawPath}`, fence].join("\n");
      }
      const language =
        EXTENSION_LANGUAGE[extname(absolute).toLowerCase()] ?? "";
      const fenceInfo = label ? `${language} [${label}]` : language;
      // Trailing newline is trimmed so the fence does not gain a blank last line.
      const code = contents.replace(/\n+$/, "");
      return [`${fence}${fenceInfo}`, code, fence].join("\n");
    },
  );
}

// --- markdown-it container rules ---------------------------------------------

// VitePress "info" admonitions and their default titles.
const ADMONITION_TITLES: Record<string, string> = {
  tip: "TIP",
  warning: "WARNING",
  info: "INFO",
  danger: "DANGER",
};

/** Reads the optional inline title after a container marker, e.g. `::: tip X`. */
function containerTitle(info: string, type: string): string {
  // `info` is the full marker text after `:::`, e.g. "tip Custom Title".
  return info.slice(info.indexOf(type) + type.length).trim();
}

/** Escapes a label for safe inclusion in injected HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Constructs three tokens for a heading-like inline block (`<tag>title</tag>`). */
function buildTitleTokens(
  Token: new (type: string, tag: string, nesting: number) => MarkdownItToken,
  tag: string,
  openType: string,
  closeType: string,
  className: string | null,
  title: string,
): MarkdownItToken[] {
  const open = new Token(openType, tag, 1);
  open.block = true;
  if (className) open.attrSet("class", className);

  const inline = new Token("inline", "", 0);
  inline.content = title;
  inline.children = [];
  const text = new Token("text", "", 0);
  text.content = title;
  inline.children.push(text);

  const close = new Token(closeType, tag, -1);
  close.block = true;

  return [open, inline, close];
}

/** Builds a leaf `html_block` token carrying raw passthrough markup. */
function buildHtmlBlock(
  Token: new (type: string, tag: string, nesting: number) => MarkdownItToken,
  content: string,
): MarkdownItToken {
  const token = new Token("html_block", "", 0);
  token.content = content;
  token.block = true;
  return token;
}

/**
 * Rebuilds the children of a `code-group` container (between `openIndex` and
 * `closeIndex`) into a radio-driven, CSS-only tabbed structure:
 *
 *   <div class="code-group">
 *     <div class="tabs">
 *       <input type="radio" name="code-group-N" id="tab-N-0" checked>
 *       <label for="tab-N-0">Label 0</label> ...
 *     </div>
 *     <div class="blocks">
 *       <div class="block active" data-tab="0"><pre><code>...</code></pre></div> ...
 *     </div>
 *   </div>
 *
 * The radios/labels/panel wrappers are emitted as `html_block` leaf tokens (the
 * walker passes those through), and each inner fence keeps its own `fence` token
 * so the highlighter still runs on it. Each fence's `[label]` names its tab.
 * Returns the replacement token run for the open..close span (inclusive).
 */
function buildCodeGroupTokens(
  Token: new (type: string, tag: string, nesting: number) => MarkdownItToken,
  tokens: MarkdownItToken[],
  openIndex: number,
  closeIndex: number,
  groupId: number,
): MarkdownItToken[] {
  const open = tokens[openIndex];
  open.tag = "div";
  open.attrSet("class", "code-group");
  const close = tokens[closeIndex];
  close.tag = "div";

  interface Fence {
    token: MarkdownItToken;
    label: string;
  }
  const fences: Fence[] = [];
  for (let i = openIndex + 1; i < closeIndex; i++) {
    const token = tokens[i];
    if (token.type !== "fence") continue;
    const info = (token.info || "").trim();
    const labelMatch = info.match(/\[([^\]]*)\]/);
    const language = info.split(/\s+/, 1)[0] || "";
    const label = labelMatch ? labelMatch[1] : language || "Code";
    fences.push({ token, label });
  }

  if (fences.length === 0) {
    // Empty group: keep the open/close pair and whatever was inside.
    return tokens.slice(openIndex, closeIndex + 1);
  }

  const tabsHtml: string[] = [`<div class="tabs">`];
  fences.forEach((fence, i) => {
    const inputId = `tab-${groupId}-${i}`;
    const checked = i === 0 ? " checked" : "";
    tabsHtml.push(
      `<input type="radio" name="code-group-${groupId}" id="${inputId}"${checked}>`,
    );
    tabsHtml.push(`<label for="${inputId}">${escapeHtml(fence.label)}</label>`);
  });
  tabsHtml.push(`</div>`);

  const inner: MarkdownItToken[] = [
    buildHtmlBlock(Token, tabsHtml.join("\n")),
    buildHtmlBlock(Token, `<div class="blocks">`),
  ];
  fences.forEach((fence, i) => {
    const active = i === 0 ? " active" : "";
    inner.push(
      buildHtmlBlock(Token, `<div class="block${active}" data-tab="${i}">`),
    );
    // Strip the `[label]` from the fence info so only the language remains for
    // the highlighter.
    fence.token.info = (fence.token.info || "")
      .replace(/\[[^\]]*\]/, "")
      .trim();
    inner.push(fence.token);
    inner.push(buildHtmlBlock(Token, `</div>`));
  });
  inner.push(buildHtmlBlock(Token, `</div>`));

  return [open, ...inner, close];
}

/**
 * A markdown-it core ruler that shapes the container OPEN tokens produced by
 * `markdown-it-container` so the downstream walker emits the right elements:
 *  - `tip|warning|info|danger` -> `div.custom-block <type>` + a leading
 *    `p.custom-block-title` (custom title from `::: tip Title`, else the type).
 *  - `details` -> `details.custom-block details` + an injected `<summary>`.
 *  - `code-group` -> a CSS-only `:checked`-driven tabbed `div.code-group`.
 *
 * It rebuilds the token array in a single backward-safe pass (collecting the
 * output, never splicing the array mid-iteration) so injected tokens never
 * disturb the indices still to be visited.
 */
function shapeContainers(tokens: MarkdownItToken[]): MarkdownItToken[] {
  if (tokens.length === 0) return tokens;
  const Token = tokens[0].constructor as new (
    type: string,
    tag: string,
    nesting: number,
  ) => MarkdownItToken;

  const output: MarkdownItToken[] = [];
  let groupCounter = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Admonition open tokens.
    const admonitionMatch = token.type.match(
      /^container_(tip|warning|info|danger)_open$/,
    );
    if (admonitionMatch) {
      const type = admonitionMatch[1];
      token.tag = "div";
      token.attrSet("class", `custom-block ${type}`);
      const custom = containerTitle(token.info.trim(), type);
      const title = custom || ADMONITION_TITLES[type] || type.toUpperCase();
      output.push(token);
      output.push(
        ...buildTitleTokens(
          Token,
          "p",
          "paragraph_open",
          "paragraph_close",
          "custom-block-title",
          title,
        ),
      );
      continue;
    }
    if (/^container_(tip|warning|info|danger)_close$/.test(token.type)) {
      token.tag = "div";
      output.push(token);
      continue;
    }

    // Details open token.
    if (token.type === "container_details_open") {
      token.tag = "details";
      token.attrSet("class", "custom-block details");
      const custom = containerTitle(token.info.trim(), "details");
      const title = custom || "Details";
      output.push(token);
      output.push(
        ...buildTitleTokens(
          Token,
          "summary",
          "summary_open",
          "summary_close",
          null,
          title,
        ),
      );
      continue;
    }
    if (token.type === "container_details_close") {
      token.tag = "details";
      output.push(token);
      continue;
    }

    // Code group: consume the whole open..close span at once.
    if (token.type === "container_code-group_open") {
      let depth = 0;
      let closeIndex = -1;
      for (let j = i; j < tokens.length; j++) {
        if (tokens[j].type === "container_code-group_open") depth++;
        else if (tokens[j].type === "container_code-group_close") {
          depth--;
          if (depth === 0) {
            closeIndex = j;
            break;
          }
        }
      }
      if (closeIndex === -1) {
        output.push(token);
        continue;
      }
      const rebuilt = buildCodeGroupTokens(
        Token,
        tokens,
        i,
        closeIndex,
        groupCounter++,
      );
      output.push(...rebuilt);
      i = closeIndex;
      continue;
    }

    output.push(token);
  }

  return output;
}

// --- Title resolution --------------------------------------------------------

/** Strips a directory + extension from a path to derive a fallback page title. */
function titleFromFilePath(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? filePath;
  const name = base.replace(/\.md$/i, "");
  if (name.toLowerCase() === "index") {
    // Use the parent directory name for index pages.
    const parts = filePath.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 2] ?? name;
  }
  return name;
}

/** Picks the first H1 heading text from a table of contents, if any. */
function firstH1(toc: TocEntry[]): string | undefined {
  return toc.find((entry) => entry.level === 1)?.text;
}

// --- markdown-it instance ----------------------------------------------------

/**
 * Builds a markdown-it instance configured for the DomphyPress feature set:
 * GFM-ish output, raw HTML pass-through, file includes, and the container rules.
 * The highlighter is wired into the fence rule indirectly: the walker calls it,
 * so it is not registered on markdown-it itself.
 */
function createParser(docsDir: string): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
  });
  md.enable(["strikethrough", "table"]);

  // `!!!include(path)!!!` — non-relative paths resolve under the docs root.
  md.use(include, { root: docsDir });

  // Register each container so `markdown-it-container` emits the matching
  // `container_<name>_open/close` tokens during parsing. The plugin's default
  // `validate` matches the container name as the first marker word and allows a
  // title after it (`::: tip Custom Title`), which is exactly what we need. The
  // actual token shaping is done by the `shapeContainers` core ruler below,
  // which reads TOKENS. The render callback is unused because the walker never
  // calls markdown-it's HTML renderer, but a no-op keeps the plugin happy.
  const noopRender = () => "";
  for (const name of [
    "tip",
    "warning",
    "info",
    "danger",
    "details",
    "code-group",
  ]) {
    md.use(container, name, { render: noopRender });
  }

  // Core ruler: shape the container open tokens after the block parse so the
  // walker sees ready-to-emit elements (and the injected titles/tabs).
  md.core.ruler.push("domphypress_containers", (state: CoreState) => {
    state.tokens = shapeContainers(state.tokens);
    return true;
  });

  return md;
}

// --- Public API --------------------------------------------------------------

/**
 * Renders a VitePress-flavoured markdown string into a Domphy element tree and
 * the page metadata DomphyPress needs. See `RenderDocOptions`/`RenderedDoc`.
 *
 * Pipeline order:
 *  1. Split YAML frontmatter.
 *  2. Collect `<script setup>` default imports, strip the script blocks.
 *  3. Replace `<CodeEditor>`/`<DomphyPreview>` tags with island placeholders.
 *  4. Expand `<<< path [label]` code imports into fenced blocks.
 *  5. Parse with markdown-it (includes + containers) and run container rules so
 *     their tokens are shaped before the walker sees them.
 *  6. Convert tokens to Domphy via `tokensToDomphy` (with the highlighter).
 *  7. Optionally run the mermaid pass over the produced body.
 *  8. Resolve the title.
 */
export async function renderDoc(
  source: string,
  options: RenderDocOptions,
): Promise<RenderedDoc> {
  const { filePath, docsDir, highlight, renderMermaid } = options;
  const fileDir = dirname(filePath);

  // 1. Frontmatter.
  const { frontmatter, content } = splitFrontmatter(source);

  // 2. Script setup imports.
  const { imports, body: withoutScript } = extractScriptImports(content);

  // 3. Islands.
  const { body: withoutWidgets, islands } = extractIslands(
    withoutScript,
    imports,
    fileDir,
    docsDir,
  );

  // 4. `<<<` code imports.
  const expanded = expandCodeImports(withoutWidgets, fileDir, docsDir);

  // 5. Parse. `md.parse` runs the core ruler chain, including the
  // `domphypress_containers` ruler that shapes the container tokens in place.
  const md = createParser(docsDir);
  const tokens = md.parse(expanded, {}) as MarkdownItToken[];

  // 6. Tokens -> Domphy.
  const { body: rendered, toc } = tokensToDomphy(tokens, { highlight });
  let body: DomphyElement[] = rendered;

  // Rewrite island placeholders (which travelled through markdown-it as raw HTML
  // blocks) into the canonical `{ div: "", dataIsland: id }` element shape.
  normalizeIslandPlaceholders(body);

  // 7. Mermaid (optional).
  if (renderMermaid) {
    body = await renderMermaid(body);
  }

  // 8. Title: frontmatter.title ?? first H1 ?? filename.
  const frontmatterTitle =
    typeof frontmatter.title === "string" ? frontmatter.title : undefined;
  const title = frontmatterTitle ?? firstH1(toc) ?? titleFromFilePath(filePath);

  return { frontmatter, body, toc, islands, title };
}
