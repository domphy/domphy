// Markdown pipeline: VitePress-baseline markdown → Domphy element tree.
// Containers (remark-directive), <<< imports, TOC, heading anchors.

import { readFileSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import type { DomphyElement } from "@domphy/core";
import type { WalkHelper } from "@domphy/markdown";
import {
  createUniqueSlugger,
  defaultSlugify,
  splitFrontmatter,
  walkMdast,
} from "@domphy/markdown";
import type { Code, Html, Nodes, Parent, Root } from "mdast";
import { remark } from "remark";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { escapeHtml, renderFence } from "./highlight.js";
import type { RenderDocOptions, RenderedDoc, TocEntry } from "./types.js";

// --- <<< code imports --------------------------------------------------------

const CODE_IMPORT_PATTERN = /^<<<\s+(\S+?)(?:\s+\[([^\]]*)\])?\s*$/gm;

const EXT_LANG: Record<string, string> = {
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
  ".rb": "ruby",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
};

function resolveSpecifier(
  spec: string,
  fileDir: string,
  docsDir: string,
): string {
  if (spec.startsWith("@/")) return resolve(dirname(docsDir), spec.slice(2));
  if (isAbsolute(spec)) return spec;
  return resolve(fileDir, spec);
}

function expandCodeImports(
  body: string,
  fileDir: string,
  docsDir: string,
): string {
  return body.replace(
    CODE_IMPORT_PATTERN,
    (_whole, rawPath: string, label?: string) => {
      const absolute = resolveSpecifier(rawPath, fileDir, docsDir);
      const fence = "```";
      let contents: string;
      try {
        contents = readFileSync(absolute, "utf8");
      } catch {
        return [fence, `Could not import: ${rawPath}`, fence].join("\n");
      }
      const language = EXT_LANG[extname(absolute).toLowerCase()] ?? "";
      const info = label ? `${language} [${label}]` : language;
      return [fence + info, contents.trimEnd(), fence].join("\n");
    },
  );
}

// --- !!!include(path)!!! ------------------------------------------------------
// markdown-it-include syntax (the pre-@domphy/press docs pipeline): paths
// resolve under the docs root, includes nest recursively. Unresolvable or
// circular includes keep the literal marker so the problem is visible on the
// rendered page instead of silently vanishing.

const INCLUDE_PATTERN = /!!!\s*include\(([^)]+)\)\s*!!!/g;

function expandIncludes(
  body: string,
  docsDir: string,
  seen: string[] = [],
): string {
  return body.replace(INCLUDE_PATTERN, (whole, rawPath: string) => {
    const absolute = resolve(docsDir, rawPath.trim());
    if (seen.includes(absolute)) return whole;
    let contents: string;
    try {
      contents = readFileSync(absolute, "utf8");
    } catch {
      return whole;
    }
    return expandIncludes(contents.trimEnd(), docsDir, [...seen, absolute]);
  });
}

// --- <Badge> component -------------------------------------------------------

function transformBadgeContent(content: string): string {
  return content.replace(
    /<Badge(?:\s+type="([^"]*?)")?\s+text="([^"]*?)"\s*\/?>/gi,
    (_, type: string | undefined, text: string) =>
      `<span class="dp-badge dp-badge-${(type ?? "tip").toLowerCase()}">${escapeHtml(text)}</span>`,
  );
}

// remark's raw-inline-HTML tokenizer splits `<span class="...">New</span>`
// into three separate sibling nodes — html(open tag), text("New"),
// html(close tag) — that is standard CommonMark behavior for any inline
// HTML wrapping plain text, not something transformBadgeContent's string
// replace can avoid. Left alone, walkMdast emits each piece as its own
// string, and Domphy's isHTML() (which requires a matched open+close pair
// within a SINGLE string) rejects each fragment individually — so the
// badge renders as literal escaped text (`&lt;span...&gt;`) instead of a
// styled element. Merge the triple back into one html node here, right
// after parsing, so it reaches walkMdast as a single self-contained string.
function pressBadgeMergePlugin(): () => (tree: Root) => void {
  const OPEN = /^<span class="dp-badge dp-badge-[\w-]+">$/;
  const CLOSE = /^<\/span>$/;

  return () => (tree: Root) => {
    visit(tree, (node: Nodes) => {
      const parent = node as unknown as Parent;
      if (!Array.isArray(parent.children)) return;
      const children = parent.children as Nodes[];

      for (let i = 0; i < children.length - 2; i++) {
        const open = children[i] as unknown as { type: string; value?: string };
        const text = children[i + 1] as unknown as {
          type: string;
          value?: string;
        };
        const close = children[i + 2] as unknown as {
          type: string;
          value?: string;
        };
        if (
          open.type === "html" &&
          OPEN.test(open.value ?? "") &&
          text.type === "text" &&
          close.type === "html" &&
          CLOSE.test(close.value ?? "")
        ) {
          const merged: Html = {
            type: "html",
            value: `${open.value}${escapeHtml(text.value ?? "")}${close.value}`,
          };
          children.splice(i, 3, merged);
        }
      }
    });
  };
}

// --- ::: container normalisation --------------------------------------------
// VitePress "::: tip My Title" → remark-directive ":::tip[My Title]"

function normalizeContainerSyntax(content: string): string {
  return content.replace(
    /^::: (\S+)(.*?)$/gm,
    (_, name: string, rest: string) => {
      const label = rest.trim();
      return label ? `:::${name}[${label}]` : `:::${name}`;
    },
  );
}

// --- Strip <script> blocks ---------------------------------------------------

function stripScriptBlocks(source: string): string {
  return source
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/^\s*\n/, "");
}

// --- Code-group remark plugin ------------------------------------------------
// Runs BEFORE pressCodePlugin so code children are still MDAST Code nodes.

let groupCounter = 0;

function pressCodeGroupPlugin(
  highlight: (code: string, lang: string) => string,
): () => (tree: Root) => void {
  return () => (tree: Root) => {
    visit(tree, "containerDirective", (node: Nodes, index, parent) => {
      const dir = node as unknown as Record<string, unknown>;
      if (dir.name !== "code-group") return;
      if (parent === undefined || index === undefined) return;

      const children = dir.children as Nodes[];
      const fences: Array<{ html: string; label: string }> = [];

      for (const child of children) {
        if (child.type !== "code") continue;
        const codeNode = child as Code;
        const info =
          (codeNode.lang ?? "") + (codeNode.meta ? ` ${codeNode.meta}` : "");
        const labelMatch = info.match(/\[([^\]]+)\]/);
        const rawLang = info.split(/\s+/, 1)[0] ?? "";
        const label = labelMatch ? labelMatch[1] : rawLang || "Code";
        const cleanInfo = info.replace(/\[[^\]]*\]/, "").trim();
        fences.push({
          html: renderFence(codeNode.value, cleanInfo, highlight),
          label,
        });
      }

      if (fences.length === 0) return;

      const id = groupCounter++;
      const inputsHtml = fences
        .map(
          (_, i) =>
            `<input type="radio" name="cg-${id}" id="cgt-${id}-${i}"${i === 0 ? " checked" : ""}>`,
        )
        .join("");
      const tabsHtml = fences
        .map(
          (f, i) =>
            `<label for="cgt-${id}-${i}">${escapeHtml(f.label)}</label>`,
        )
        .join("");
      const blocksHtml = fences.map((f) => f.html).join("");

      const html = `<div class="code-group">${inputsHtml}<div class="tabs">${tabsHtml}</div><div class="blocks">${blocksHtml}</div></div>`;
      (parent as Parent).children.splice(index, 1, {
        type: "html",
        value: html,
      } as Html);
    });
  };
}

// --- Remark plugin: render remaining code blocks via renderFence -------------

function pressCodePlugin(
  highlight: (code: string, lang: string) => string,
): () => (tree: Root) => void {
  return () => (tree: Root) => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (parent === undefined || index === undefined) return;
      const info = (node.lang ?? "") + (node.meta ? ` ${node.meta}` : "");
      const html = renderFence(node.value, info, highlight);
      (parent as Parent).children.splice(index, 1, {
        type: "html",
        value: html,
      } as Html);
    });
  };
}

// --- Directive → Domphy converter -------------------------------------------

const ADMONITION_TITLES: Record<string, string> = {
  tip: "TIP",
  warning: "WARNING",
  info: "INFO",
  danger: "DANGER",
  note: "NOTE",
  abstract: "ABSTRACT",
  success: "SUCCESS",
  question: "QUESTION",
  failure: "FAILURE",
  bug: "BUG",
  example: "EXAMPLE",
  quote: "QUOTE",
};

// remark-directive represents `:::name[Label]` by prepending a paragraph
// child flagged `data.directiveLabel` — the directive node itself carries no
// label property. Pull that paragraph's text out and drop it from the content
// children so it doesn't render twice.
function extractDirectiveLabel(children: Nodes[]): {
  label: string;
  content: Nodes[];
} {
  const first = children[0] as unknown as
    | { data?: { directiveLabel?: boolean } }
    | undefined;
  if (!first?.data?.directiveLabel) return { label: "", content: children };
  return { label: mdastText(children[0]), content: children.slice(1) };
}

function mdastText(node: Nodes): string {
  const record = node as unknown as { value?: string; children?: Nodes[] };
  if (typeof record.value === "string") return record.value;
  if (Array.isArray(record.children))
    return record.children.map(mdastText).join("");
  return "";
}

function pressDirectiveHandler(
  node: Nodes,
  helper: WalkHelper,
): DomphyElement | string | null {
  const dir = node as unknown as Record<string, unknown>;
  if (dir.type !== "containerDirective") return null;

  const name = dir.name as string;
  const { label, content: children } = extractDirectiveLabel(
    dir.children as Nodes[],
  );

  if (ADMONITION_TITLES[name]) {
    const title = label || ADMONITION_TITLES[name];
    const titleEl = {
      p: [title],
      class: "custom-block-title",
    } as DomphyElement;
    const content = helper.walkChildren({ children });
    return {
      div: [titleEl, ...content],
      class: `custom-block ${name}`,
    } as DomphyElement;
  }

  if (name === "details") {
    const summary = label || "Details";
    const content = helper.walkChildren({ children });
    return {
      details: [{ summary: [summary] } as DomphyElement, ...content],
      class: "custom-block details",
    } as DomphyElement;
  }

  if (name === "steps") {
    const content = helper.walkChildren({ children });
    return { div: content, class: "custom-block steps" } as DomphyElement;
  }

  if (name === "card-grid") {
    const content = helper.walkChildren({ children });
    return { div: content, class: "custom-block card-grid" } as DomphyElement;
  }

  if (name === "card") {
    const content = helper.walkChildren({ children });
    const inner: (string | DomphyElement)[] = label
      ? [{ p: [label], class: "card-title" } as DomphyElement, ...content]
      : content;
    return { div: inner, class: "custom-block card" } as DomphyElement;
  }

  if (name === "link-card") {
    const linkMatch = label.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    const href = linkMatch ? linkMatch[2] : "#";
    const title = linkMatch ? linkMatch[1] : label;
    const content = helper.walkChildren({ children });
    const inner: (string | DomphyElement)[] = title
      ? [{ p: [title], class: "link-card-title" } as DomphyElement, ...content]
      : content;
    return { a: inner, href, class: "custom-block link-card" } as DomphyElement;
  }

  return null;
}

// --- Title resolution --------------------------------------------------------

function titleFromFilePath(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? filePath;
  const name = base.replace(/\.md$/i, "");
  if (name.toLowerCase() === "index") {
    const parts = filePath.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 2] ?? name;
  }
  return name;
}

function firstH1(toc: TocEntry[]): string | undefined {
  return toc.find((e) => e.level === 1)?.text;
}

// --- Public API --------------------------------------------------------------

export async function renderDoc(
  source: string,
  options: RenderDocOptions,
): Promise<RenderedDoc> {
  const { filePath, docsDir, highlight } = options;
  const fileDir = dirname(filePath);
  const { frontmatter, content } = splitFrontmatter(source);

  // Text-level preprocessing. Includes expand first so `<<<` imports and
  // Badge markers inside snippet files get the same treatment as the page's
  // own source.
  const stripped = stripScriptBlocks(content);
  const included = expandIncludes(stripped, docsDir);
  const imported = expandCodeImports(included, fileDir, docsDir);
  const badged = transformBadgeContent(imported);
  const normalized = normalizeContainerSyntax(badged);

  // Build remark processor with press-specific plugins.
  // Order matters: badge-merge must run before code-group/pressCodePlugin
  // so the reassembled <span> reaches them (and walkMdast) as one html
  // node; code-group must run before pressCodePlugin so it can access the
  // MDAST Code nodes before they become html strings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proc = remark()
    .use(remarkGfm as any)
    .use(remarkDirective as any)
    .use(pressBadgeMergePlugin())
    .use(pressCodeGroupPlugin(highlight))
    .use(pressCodePlugin(highlight));

  const tree = proc.parse(normalized) as Root;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (proc as any).runSync(tree, normalized);

  const slug = createUniqueSlugger(defaultSlugify);
  const toc: TocEntry[] = [];

  const body = walkMdast(tree, {
    slug,
    toc,
    onCustom: pressDirectiveHandler,
  });

  const frontmatterTitle =
    typeof frontmatter.title === "string" ? frontmatter.title : undefined;
  const title = frontmatterTitle ?? firstH1(toc) ?? titleFromFilePath(filePath);
  return { frontmatter, body, toc, islands: [], title };
}
