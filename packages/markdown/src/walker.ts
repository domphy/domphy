import type { DomphyElement } from "@domphy/core";
import type { Highlight, TocEntry } from "./types.js";

/** markdown-it token type, taken from the markdown-it namespace. */
type Token = import("markdown-it").Token;
/** markdown-it instance type. */
type MarkdownIt = import("markdown-it").default;

/** A child of a Domphy element: a string text node or a nested element. */
type Child = string | DomphyElement;

/** Mutable element object built while walking; cast to DomphyElement on return. */
type MutableElement = Record<string, unknown>;

interface WalkContext {
  /** Optional highlighter applied to fenced code blocks. */
  highlight?: Highlight;
  /** Slug generator (already wrapped for per-document uniqueness). */
  slug: (text: string) => string;
  /** Collected table of contents, filled as headings are walked. */
  toc: TocEntry[];
}

/** Copies markdown-it token attributes onto a Domphy element object. */
function applyAttrs(element: MutableElement, token: Token): void {
  if (!token.attrs) return;
  for (const [name, value] of token.attrs) {
    if (name === "class") {
      // markdown-it uses `class`; Domphy element objects accept it directly.
      element.class = value;
    } else {
      element[name] = value;
    }
  }
}

/**
 * Builds the inner HTML string for a fenced code block, escaping the raw code
 * the same way markdown-it would. Used when no highlighter is supplied or the
 * highlighter declines to handle the block.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Converts a flat run of inline tokens (the `children` of an `inline` token)
 * into an array of Domphy children. Inline tokens are a stack-based stream:
 * `*_open` pushes a wrapper, `*_close` pops it, and leaf tokens append content
 * to the element currently on top of the stack.
 */
function walkInline(tokens: Token[]): Child[] {
  const root: Child[] = [];
  // The stack holds the children arrays we are currently appending into.
  const stack: Child[][] = [root];

  const top = (): Child[] => stack[stack.length - 1];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        if (token.content) top().push(token.content);
        break;
      }
      case "softbreak": {
        // A soft line break renders as a space in HTML output.
        top().push(" ");
        break;
      }
      case "hardbreak": {
        top().push({ br: null } as DomphyElement);
        break;
      }
      case "code_inline": {
        top().push({ code: token.content } as DomphyElement);
        break;
      }
      case "strong_open":
      case "em_open":
      case "s_open": {
        const tag = token.tag; // "strong" | "em" | "s"
        const children: Child[] = [];
        const element: MutableElement = { [tag]: children };
        applyAttrs(element, token);
        top().push(element as DomphyElement);
        stack.push(children);
        break;
      }
      case "link_open": {
        const children: Child[] = [];
        const element: MutableElement = { a: children };
        applyAttrs(element, token);
        top().push(element as DomphyElement);
        stack.push(children);
        break;
      }
      case "strong_close":
      case "em_close":
      case "s_close":
      case "link_close": {
        if (stack.length > 1) stack.pop();
        break;
      }
      case "image": {
        const element: MutableElement = { img: null };
        applyAttrs(element, token);
        // markdown-it puts the alt text in the token's children; flatten it to
        // plain text for the `alt` attribute.
        const alt = token.children
          ? renderInlineText(token.children)
          : token.content;
        if (alt) element.alt = alt;
        top().push(element as DomphyElement);
        break;
      }
      case "html_inline": {
        // Raw inline HTML: pass the markup through as content. Domphy renders a
        // single-root HTML string as inline HTML; wrap it in a span so the
        // markup survives even when it is a bare fragment.
        top().push({ span: token.content } as DomphyElement);
        break;
      }
      default: {
        // Unknown inline token: fall back to its rendered content as text so no
        // content is dropped.
        if (token.content) top().push(token.content);
        break;
      }
    }
  }

  return root;
}

/** Flattens inline tokens to plain text (markup removed), for alt/title/toc. */
function renderInlineText(tokens: Token[]): string {
  let out = "";
  for (const token of tokens) {
    if (token.type === "text" || token.type === "code_inline") {
      out += token.content;
    } else if (token.type === "softbreak" || token.type === "hardbreak") {
      out += " ";
    } else if (token.type === "image") {
      out += token.content;
    } else if (token.children) {
      out += renderInlineText(token.children);
    }
  }
  return out;
}

/**
 * Builds a `<pre><code>` element for a fenced or indented code block, preserving
 * the language as `data-language` and `class="language-..."` so a downstream
 * highlighter can find it, and invoking the highlighter option when present.
 */
function buildCodeBlock(token: Token, context: WalkContext): DomphyElement {
  const info = (token.info || "").trim();
  const language = info.split(/\s+/, 1)[0] || "";
  const code = token.content;

  // Resolve the <code> content first. The tag key must be the first property
  // of a Domphy element object, so content is decided before attributes.
  let content: string | DomphyElement[];
  if (context.highlight) {
    const highlighted = context.highlight(code, language);
    if (typeof highlighted === "string" && highlighted.length > 0) {
      // Treat the returned string as inner HTML of <code>. It may contain
      // multiple roots (e.g. several token spans), so it lives as the sole
      // content of the code element where Domphy renders it as HTML.
      content = highlighted;
    } else if (highlighted && typeof highlighted === "object") {
      content = [highlighted];
    } else {
      content = escapeHtml(code);
    }
  } else {
    // No highlighter: keep the raw code as escaped HTML content so newlines and
    // indentation are preserved verbatim inside <pre>.
    content = escapeHtml(code);
  }

  const codeElement: MutableElement = { code: content };
  if (language) {
    // markdown-it/highlighters look for `data-language` and `language-*`; the
    // camelCase `dataLanguage` is Domphy's data-attribute form and is only
    // valid as a non-first key, which it is here.
    codeElement.dataLanguage = language;
    codeElement.class = `language-${language}`;
  }
  return { pre: [codeElement as DomphyElement] };
}

/**
 * Walks the block-level token stream into Domphy elements. Block tokens are a
 * stack-based stream just like inline tokens: `*_open`/`*_close` pairs delimit
 * containers and standalone tokens (`inline`, `fence`, `hr`, `html_block`)
 * append directly to the current container.
 */
export function walkTokens(
  tokens: Token[],
  context: WalkContext,
): DomphyElement[] {
  const root: DomphyElement[] = [];
  // Each frame is the children array of an open container plus the tag, so we
  // can collect heading text on close for the table of contents.
  interface Frame {
    children: Child[];
    element: MutableElement;
    token: Token;
  }
  const root_frame: Frame = {
    children: root as Child[],
    element: { _root: root },
    token: tokens[0],
  };
  const stack: Frame[] = [root_frame];

  const top = (): Frame => stack[stack.length - 1];
  const pushContainer = (tag: string, token: Token): void => {
    const children: Child[] = [];
    const element: MutableElement = { [tag]: children };
    applyAttrs(element, token);
    top().children.push(element as DomphyElement);
    stack.push({ children, element, token });
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.hidden) {
      // markdown-it marks the wrapping paragraph of a tight list item hidden;
      // its open/close emit no element but still bracket inline content.
      continue;
    }

    if (token.nesting === 1 && token.type.endsWith("_open")) {
      if (token.type === "heading_open") {
        // Heading: collect text from the following inline token for the slug
        // and table of contents, then emit the heading with an id.
        const inline = tokens[i + 1];
        const text = inline?.children ? renderInlineText(inline.children) : "";
        const slug = context.slug(text);
        const level = Number(token.tag.slice(1)) || 1;
        context.toc.push({ level, text, slug });

        const children: Child[] = [];
        const element: MutableElement = { [token.tag]: children, id: slug };
        applyAttrs(element, token);
        // markdown-it/anchor may also set an id; our slug wins for consistency
        // with the collected toc.
        element.id = slug;
        top().children.push(element as DomphyElement);
        stack.push({ children, element, token });
        continue;
      }

      if (token.type === "table_open") {
        pushContainer("table", token);
        continue;
      }
      if (
        token.type === "thead_open" ||
        token.type === "tbody_open" ||
        token.type === "tr_open"
      ) {
        pushContainer(token.tag, token);
        continue;
      }
      if (token.type === "th_open" || token.type === "td_open") {
        pushContainer(token.tag, token);
        continue;
      }

      // Generic container open: paragraph, blockquote, bullet/ordered list,
      // list item, etc. markdown-it carries the correct HTML tag in `token.tag`.
      pushContainer(token.tag, token);

      if (token.type === "list_item_open") {
        // List items need a stable `_key` for Domphy list diffing. Use the
        // item's position among its siblings.
        const frame = top();
        const siblings = stack[stack.length - 2].children;
        frame.element._key = siblings.length - 1;
      }
      continue;
    }

    if (token.nesting === -1 && token.type.endsWith("_close")) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    // Standalone (self-contained) tokens.
    switch (token.type) {
      case "inline": {
        const children = walkInline(token.children || []);
        for (const child of children) top().children.push(child);
        break;
      }
      case "fence":
      case "code_block": {
        top().children.push(buildCodeBlock(token, context));
        break;
      }
      case "hr": {
        top().children.push({ hr: null } as DomphyElement);
        break;
      }
      case "html_block": {
        // Block-level raw HTML. Pass it through as content. A single-root HTML
        // string renders as inline HTML in Domphy; for multi-root blocks we
        // wrap in a div so the whole block is preserved as one element's HTML.
        top().children.push({ div: token.content.trim() } as DomphyElement);
        break;
      }
      default: {
        if (token.content) {
          top().children.push(token.content);
        }
        break;
      }
    }
  }

  return root;
}

/** Convenience type for the markdown-it instance used by the walker. */
export type Parser = MarkdownIt;
