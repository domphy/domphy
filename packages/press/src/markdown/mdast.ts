import { type DomphyElement, type RawHTML, rawHtml } from "@domphy/core";
import type {
  Code,
  Definition,
  FootnoteDefinition,
  ListItem,
  Nodes,
  Root,
  Table,
} from "mdast";
import type { Highlight, TocEntry } from "./types.js";

/** Public walk helper passed to custom node handlers. */
export interface WalkHelper {
  /** Walk the children of a parent node into Domphy children. */
  walkChildren: (parent: {
    children: Nodes[];
  }) => (string | RawHTML | DomphyElement)[];
}

/** Internal walk context threaded through the recursion. */
interface WalkContext {
  highlight?: Highlight;
  slug: (text: string) => string;
  toc: TocEntry[];
  onCustom?: (node: Nodes, helper: WalkHelper) => DomphyElement | string | null;
  definitions: Map<string, Definition>;
  footnoteDefinitions: Map<string, FootnoteDefinition>;
  footnoteOrder: string[];
  footnoteCounts: Map<string, number>;
}

/** Inherited: mdast-util-to-hast default `clobberPrefix` (GitHub GFM). */
const FOOTNOTE_CLOBBER_PREFIX = "user-content-";

/** Public options for {@link walkMdast}. */
export interface MdastWalkOptions {
  highlight?: Highlight;
  slug: (text: string) => string;
  toc: TocEntry[];
  /** Handle MDAST nodes that the core walker doesn't know about (e.g. directive
   *  nodes from remark-directive). Return null to fall back to the default. */
  onCustom?: (node: Nodes, helper: WalkHelper) => DomphyElement | string | null;
}

type Child = string | RawHTML | DomphyElement;

/**
 * Neutralizes script-capable URL schemes in author-supplied markdown
 * link/image destinations. Mirrors @domphy/core's `isDangerousURL`
 * canonicalization (ASCII whitespace/control characters stripped — browsers
 * ignore them inside a scheme — then lowercased); remark has already decoded
 * HTML entities in the destination by this point. Everything else (http(s),
 * mailto, relative paths, anchors, `data:image/…`) passes through unchanged,
 * matching react-markdown's default URL transform contract.
 */
function sanitizeUrl(url: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ASCII control characters out of the scheme is exactly the point of this canonicalization (same pattern as @domphy/core's isDangerousURL).
  const canonical = url.replace(/[\x00-\x20]+/g, "").toLowerCase();
  if (
    canonical.startsWith("javascript:") ||
    canonical.startsWith("vbscript:") ||
    canonical.startsWith("data:text/html") ||
    canonical.startsWith("data:application/xhtml+xml")
  ) {
    return "#";
  }
  return url;
}

/** Recursively flatten an MDAST node to plain text (for heading anchors / toc). */
export function nodeToText(node: Nodes): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if ("children" in node && Array.isArray(node.children))
    return (node.children as Nodes[]).map(nodeToText).join("");
  return "";
}

/** Walk a parent's children into Domphy children, filtering nulls. */
export function walkChildren(
  node: { children: Nodes[] },
  ctx: WalkContext,
): Child[] {
  return node.children
    .map((child) => walkNode(child, ctx))
    .filter((c): c is Child => c !== null);
}

function walkNode(node: Nodes, ctx: WalkContext): Child | null {
  switch (node.type) {
    case "text":
      // Soft line breaks in paragraphs are encoded as \n in the text value.
      // CommonMark renders them as spaces; do the same so whitespace is clean.
      return node.value.replace(/\n/g, " ");

    case "inlineCode":
      return { code: node.value } as DomphyElement;

    case "break":
      return { br: null } as DomphyElement;

    case "thematicBreak":
      return { hr: null } as DomphyElement;

    case "html":
      // A raw HTML block/inline node in the source IS markup by definition —
      // the one place markdown opts a string into the HTML path. Author-written
      // Markdown is trusted input; core still sanitizes script/on*/javascript:.
      return rawHtml(node.value);

    case "heading": {
      const text = nodeToText(node);
      const slug = ctx.slug(text);
      ctx.toc.push({ level: node.depth, text, slug });
      const children = walkChildren(node, ctx);
      children.push({
        a: "#",
        href: `#${slug}`,
        class: "header-anchor",
        // aria-hidden but still keyboard-reachable without tabIndex -1
        // (axe aria-hidden-focus); screen readers use the TOC instead.
        ariaHidden: "true",
        tabIndex: -1,
      } as DomphyElement);
      return {
        [`h${node.depth}`]: children,
        id: slug,
      } as unknown as DomphyElement;
    }

    case "paragraph":
      return { p: walkChildren(node, ctx) } as DomphyElement;

    case "strong":
      return { strong: walkChildren(node, ctx) } as DomphyElement;

    case "emphasis":
      return { em: walkChildren(node, ctx) } as DomphyElement;

    case "delete":
      return { s: walkChildren(node, ctx) } as DomphyElement;

    case "link":
      return buildLink(node.url, node.title, walkChildren(node, ctx));

    case "image":
      return buildImage(node.url, node.alt ?? "", node.title);

    case "linkReference": {
      const definition = ctx.definitions.get(node.identifier);
      if (!definition) {
        const children = walkChildren(node, ctx);
        if (children.length === 0) return null;
        if (children.length === 1) return children[0];
        return { span: children } as DomphyElement;
      }
      return buildLink(
        definition.url,
        definition.title,
        walkChildren(node, ctx),
      );
    }

    case "imageReference": {
      const definition = ctx.definitions.get(node.identifier);
      if (!definition) return node.alt ?? null;
      return buildImage(definition.url, node.alt ?? "", definition.title);
    }

    case "blockquote":
      return { blockquote: walkChildren(node, ctx) } as DomphyElement;

    case "list":
      return {
        [node.ordered ? "ol" : "ul"]: node.children.map((item, i) =>
          walkListItem(item, i, !!node.ordered, ctx),
        ),
      } as unknown as DomphyElement;

    case "code":
      return buildCode(node, ctx);

    case "table":
      return buildTable(node, ctx);

    case "definition":
    case "footnoteDefinition":
      return null;

    case "footnoteReference":
      return buildFootnoteReference(node.identifier, ctx);

    default: {
      if (ctx.onCustom) {
        const helper: WalkHelper = {
          walkChildren: (parent) => walkChildren(parent, ctx),
        };
        const result = ctx.onCustom(node, helper);
        if (result !== null) return result;
      }
      if ("children" in node && Array.isArray(node.children)) {
        const children = walkChildren(
          node as unknown as { children: Nodes[] },
          ctx,
        );
        if (children.length === 0) return null;
        if (children.length === 1) return children[0];
        return { span: children } as DomphyElement;
      }
      if ("value" in node && typeof node.value === "string") return node.value;
      return null;
    }
  }
}

function buildLink(
  url: string,
  title: string | null | undefined,
  children: Child[],
): DomphyElement {
  const href = sanitizeUrl(url);
  const el: Record<string, unknown> = { a: children, href };
  if (title) el.title = title;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    el.target = "_blank";
    el.rel = "noopener noreferrer";
  }
  return el as DomphyElement;
}

function buildImage(
  url: string,
  alt: string,
  title: string | null | undefined,
): DomphyElement {
  const el: Record<string, unknown> = {
    img: null,
    src: sanitizeUrl(url),
    alt,
    loading: "lazy",
  };
  if (title) el.title = title;
  return el as DomphyElement;
}

function buildFootnoteReference(
  identifier: string,
  ctx: WalkContext,
): Child | null {
  if (!ctx.footnoteDefinitions.has(identifier)) return null;

  let reuse = ctx.footnoteCounts.get(identifier);
  let counter: number;
  if (reuse === undefined) {
    reuse = 0;
    ctx.footnoteOrder.push(identifier);
    counter = ctx.footnoteOrder.length;
  } else {
    counter = ctx.footnoteOrder.indexOf(identifier) + 1;
  }
  reuse += 1;
  ctx.footnoteCounts.set(identifier, reuse);

  return {
    sup: [
      {
        a: String(counter),
        href: `#${FOOTNOTE_CLOBBER_PREFIX}fn-${identifier}`,
        id:
          `${FOOTNOTE_CLOBBER_PREFIX}fnref-${identifier}` +
          (reuse > 1 ? `-${reuse}` : ""),
        dataFootnoteRef: true,
        "aria-describedby": "footnote-label",
      } as DomphyElement,
    ],
  } as DomphyElement;
}

function buildFootnoteBackref(
  identifier: string,
  referenceIndex: number,
  rereferenceIndex: number,
): DomphyElement {
  const label =
    `Back to reference ${referenceIndex + 1}` +
    (rereferenceIndex > 1 ? `-${rereferenceIndex}` : "");
  const content: Child | Child[] =
    rereferenceIndex > 1 ? ["↩", { sup: String(rereferenceIndex) }] : "↩";
  return {
    a: content,
    href:
      `#${FOOTNOTE_CLOBBER_PREFIX}fnref-${identifier}` +
      (rereferenceIndex > 1 ? `-${rereferenceIndex}` : ""),
    dataFootnoteBackref: true,
    ariaLabel: label,
    class: "data-footnote-backref",
  } as unknown as DomphyElement;
}

function buildFootnotesSection(ctx: WalkContext): DomphyElement | null {
  const items: DomphyElement[] = [];

  for (
    let referenceIndex = 0;
    referenceIndex < ctx.footnoteOrder.length;
    referenceIndex++
  ) {
    const identifier = ctx.footnoteOrder[referenceIndex];
    const definition = ctx.footnoteDefinitions.get(identifier);
    if (!definition) continue;

    const children = walkChildren(definition, ctx);
    const counts = ctx.footnoteCounts.get(identifier) ?? 0;
    const backrefs: Child[] = [];
    for (
      let rereferenceIndex = 1;
      rereferenceIndex <= counts;
      rereferenceIndex++
    ) {
      if (backrefs.length > 0) backrefs.push(" ");
      backrefs.push(
        buildFootnoteBackref(identifier, referenceIndex, rereferenceIndex),
      );
    }

    const last = children[children.length - 1];
    if (last && typeof last === "object" && "p" in last) {
      const paragraphChildren = (last as { p: Child[] }).p;
      if (Array.isArray(paragraphChildren)) {
        paragraphChildren.push(" ", ...backrefs);
      }
    } else {
      children.push(...backrefs);
    }

    items.push({
      li: children,
      id: `${FOOTNOTE_CLOBBER_PREFIX}fn-${identifier}`,
      _key: referenceIndex,
    } as unknown as DomphyElement);
  }

  if (items.length === 0) return null;

  return {
    section: [
      {
        h2: "Footnotes",
        id: "footnote-label",
        class: "sr-only",
      } as DomphyElement,
      { ol: items } as DomphyElement,
    ],
    class: "footnotes",
    dataFootnotes: true,
  } as unknown as DomphyElement;
}

function collectAssociations(node: Nodes, ctx: WalkContext): void {
  if (node.type === "definition") {
    if (!ctx.definitions.has(node.identifier)) {
      ctx.definitions.set(node.identifier, node);
    }
    return;
  }
  if (node.type === "footnoteDefinition") {
    if (!ctx.footnoteDefinitions.has(node.identifier)) {
      ctx.footnoteDefinitions.set(node.identifier, node);
    }
    return;
  }
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      collectAssociations(child as Nodes, ctx);
    }
  }
}

function walkListItem(
  item: ListItem,
  index: number,
  _ordered: boolean,
  ctx: WalkContext,
): DomphyElement {
  const children: Child[] = [];

  // GFM task list checkbox (remark-gfm sets item.checked)
  if (typeof item.checked === "boolean") {
    const input: Record<string, unknown> = {
      input: null,
      type: "checkbox",
      disabled: true,
    };
    if (item.checked) input.checked = true;
    children.push(input as DomphyElement);
  }

  for (const child of item.children) {
    // Tight lists: unwrap single paragraph so text flows directly in li
    if (child.type === "paragraph" && !item.spread) {
      children.push(...walkChildren(child, ctx));
    } else {
      const el = walkNode(child, ctx);
      if (el !== null) children.push(el);
    }
  }

  return { li: children, _key: index } as unknown as DomphyElement;
}

function buildCode(node: Code, ctx: WalkContext): DomphyElement {
  const lang = node.lang ?? "";
  // Pass the full info string (lang + meta) to the highlighter, matching the
  // same format as markdown-it's fence info so renderFence-style highlighters
  // can parse line-range and title metadata from the second part.
  const info = lang + (node.meta ? ` ${node.meta}` : "");

  if (ctx.highlight) {
    const result = ctx.highlight(node.value, info);
    if (typeof result === "string" && result.length > 0) {
      // A highlighter returns token markup (<span class="...">…), so it opts
      // into the HTML path explicitly.
      const codeEl: Record<string, unknown> = { code: rawHtml(result) };
      if (lang) {
        codeEl.dataLanguage = lang;
        codeEl.class = `language-${lang}`;
      }
      return { pre: [codeEl as DomphyElement] } as DomphyElement;
    }
    if (result && typeof result === "object") {
      return result as DomphyElement;
    }
  }

  // Pass the raw text through: @domphy/core's TextNode.generateHTML() escapes
  // plain text itself. Pre-escaping here would double-escape (isHTML() only
  // recognizes literal <tag> substrings, which pre-escaping always removes).
  const codeEl: Record<string, unknown> = { code: node.value };
  if (lang) {
    codeEl.dataLanguage = lang;
    codeEl.class = `language-${lang}`;
  }
  return { pre: [codeEl as DomphyElement] } as DomphyElement;
}

function buildTable(node: Table, ctx: WalkContext): DomphyElement {
  const [headerRow, ...bodyRows] = node.children;
  const align = node.align ?? [];

  const headerCells = (headerRow?.children ?? []).map((cell, i) => {
    const el: Record<string, unknown> = { th: walkChildren(cell, ctx) };
    if (align[i]) el.style = { textAlign: align[i] };
    return el as DomphyElement;
  });

  const thead = {
    thead: [{ tr: headerCells } as DomphyElement],
  } as DomphyElement;

  const tbody = {
    tbody: bodyRows.map(
      (row) =>
        ({
          tr: row.children.map((cell, i) => {
            const el: Record<string, unknown> = { td: walkChildren(cell, ctx) };
            if (align[i]) el.style = { textAlign: align[i] };
            return el as DomphyElement;
          }),
        }) as DomphyElement,
    ),
  } as DomphyElement;

  return { table: [thead, tbody] } as DomphyElement;
}

/**
 * Converts a parsed remark MDAST tree into a Domphy element array.
 * External customisation (e.g. press containers) goes in `options.onCustom`.
 */
export function walkMdast(
  root: Root,
  options: MdastWalkOptions,
): DomphyElement[] {
  const ctx: WalkContext = {
    highlight: options.highlight,
    slug: options.slug,
    toc: options.toc,
    onCustom: options.onCustom,
    definitions: new Map(),
    footnoteDefinitions: new Map(),
    footnoteOrder: [],
    footnoteCounts: new Map(),
  };
  collectAssociations(root, ctx);
  const body = root.children
    .map((child) => walkNode(child, ctx))
    .filter((el): el is Child => el !== null) as DomphyElement[];
  const footnotes = buildFootnotesSection(ctx);
  if (footnotes) body.push(footnotes);
  return body;
}
