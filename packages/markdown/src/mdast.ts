import type { DomphyElement } from "@domphy/core";
import type {
  Blockquote,
  Break,
  Code,
  Delete,
  Emphasis,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Nodes,
  Paragraph,
  Root,
  Strong,
  Table,
  TableRow,
  Text,
  ThematicBreak,
} from "mdast";
import type { Highlight, TocEntry } from "./types.js";

/** Public walk helper passed to custom node handlers. */
export interface WalkHelper {
  /** Walk the children of a parent node into Domphy children. */
  walkChildren: (parent: { children: Nodes[] }) => (string | DomphyElement)[];
}

/** Internal walk context threaded through the recursion. */
interface WalkContext {
  highlight?: Highlight;
  slug: (text: string) => string;
  toc: TocEntry[];
  onCustom?: (node: Nodes, helper: WalkHelper) => DomphyElement | string | null;
}

/** Public options for {@link walkMdast}. */
export interface MdastWalkOptions {
  highlight?: Highlight;
  slug: (text: string) => string;
  toc: TocEntry[];
  /** Handle MDAST nodes that the core walker doesn't know about (e.g. directive
   *  nodes from remark-directive). Return null to fall back to the default. */
  onCustom?: (node: Nodes, helper: WalkHelper) => DomphyElement | string | null;
}

type Child = string | DomphyElement;

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
      return node.value;

    case "heading": {
      const text = nodeToText(node);
      const slug = ctx.slug(text);
      ctx.toc.push({ level: node.depth, text, slug });
      const children = walkChildren(node, ctx);
      children.push({
        a: "#",
        href: `#${slug}`,
        class: "header-anchor",
        ariaHidden: "true",
      } as DomphyElement);
      return { [`h${node.depth}`]: children, id: slug } as unknown as DomphyElement;
    }

    case "paragraph":
      return { p: walkChildren(node, ctx) } as DomphyElement;

    case "strong":
      return { strong: walkChildren(node, ctx) } as DomphyElement;

    case "emphasis":
      return { em: walkChildren(node, ctx) } as DomphyElement;

    case "delete":
      return { s: walkChildren(node, ctx) } as DomphyElement;

    case "link": {
      const el: Record<string, unknown> = {
        a: walkChildren(node, ctx),
        href: node.url,
      };
      if (node.title) el.title = node.title;
      const href = node.url;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        el.target = "_blank";
        el.rel = "noopener noreferrer";
      }
      return el as DomphyElement;
    }

    case "image": {
      const el: Record<string, unknown> = {
        img: null,
        src: node.url,
        alt: node.alt ?? "",
        loading: "lazy",
      };
      if (node.title) el.title = node.title;
      return el as DomphyElement;
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
    case "linkReference":
    case "imageReference":
      return null;

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

function walkListItem(
  item: ListItem,
  index: number,
  ordered: boolean,
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
      const codeEl: Record<string, unknown> = { code: result };
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
  };
  return root.children
    .map((child) => walkNode(child, ctx))
    .filter((el): el is Child => el !== null) as DomphyElement[];
}
