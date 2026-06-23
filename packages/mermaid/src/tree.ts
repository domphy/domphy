import type { DomphyElement } from "@domphy/core";
import { renderMermaidCached } from "./cache.js";
import type { MermaidRenderer, TreeOptions } from "./types.js";

/** Loose view of a Domphy element object so we can read arbitrary keys. */
type ElementRecord = Record<string, unknown>;

/** Children of an element: text nodes or nested elements. */
type Child = string | number | null | undefined | DomphyElement;

/** HTML tag names that never hold mermaid blocks; cheap to skip. */
const SELF_CONTAINED_VOID = new Set(["br", "hr", "img", "input"]);

/**
 * Reverses the HTML escaping `@domphy/markdown` applies to fenced code content,
 * recovering the original diagram source. Mirrors the `escapeHtml` in the
 * markdown walker (`&`, `<`, `>`, `"`).
 */
function unescapeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** True when `value` is a non-null plain object (a candidate element). */
function isObject(value: unknown): value is ElementRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Detects whether an element is a `<code>` node carrying the `mermaid` language,
 * matching the shape `@domphy/markdown` emits:
 * `{ code: <string>, dataLanguage: "mermaid", class: "language-mermaid" }`.
 * Accepts either marker so it is resilient to highlighter variations.
 */
function isMermaidCode(element: ElementRecord): boolean {
  if (!("code" in element)) return false;
  const language = element.dataLanguage;
  if (typeof language === "string" && language.toLowerCase() === "mermaid") {
    return true;
  }
  const className = element.class;
  if (typeof className === "string") {
    return /(^|\s)language-mermaid(\s|$)/i.test(className);
  }
  return false;
}

/**
 * Extracts the raw Mermaid source from a `<code>` element's content. The walker
 * stores escaped HTML as the `code` value; a highlighter could in theory store
 * structured children, but mermaid blocks are not highlighted, so the content is
 * a string.
 */
function extractSource(element: ElementRecord): string | null {
  const content = element.code;
  if (typeof content === "string") return unescapeHtml(content);
  return null;
}

/**
 * Returns the single tag key of a Domphy element (the first own key whose value
 * is the element content), or `null` when the object is not a tagged element.
 * The markdown walker always places the tag key first.
 */
function tagKeyOf(element: ElementRecord): string | null {
  for (const key of Object.keys(element)) {
    // Skip Domphy meta/attribute keys; the tag is the first content-bearing key.
    if (
      key.startsWith("_") ||
      key.startsWith("data") ||
      key.startsWith("aria")
    ) {
      continue;
    }
    return key;
  }
  return Object.keys(element)[0] ?? null;
}

/**
 * Recursively walks the tree and accumulates every distinct mermaid diagram
 * source into the `sources` set, so all diagrams can be batched and rendered in
 * one pass. Returns nothing; the actual replacement happens in a second pass
 * (`replaceInChildren`) once all SVGs are rendered.
 */
function collectSources(elements: Child[], sources: Set<string>): void {
  for (const element of elements) {
    if (!isObject(element)) continue;

    const record = element as ElementRecord;

    if (isMermaidCode(record)) {
      const source = extractSource(record);
      if (source) sources.add(source);
      continue;
    }

    const tag = tagKeyOf(record);
    if (tag && SELF_CONTAINED_VOID.has(tag)) continue;

    walkChildren(record, (children) => collectSources(children, sources));
  }
}

/**
 * Invokes `visit` with the array-typed children of an element. When the content
 * is a single object child (e.g. `pre`'s single `code`) it is wrapped in an
 * array so the visitor sees a uniform shape. String/number content has no nested
 * elements and is ignored.
 */
function walkChildren(
  element: ElementRecord,
  visit: (children: Child[]) => void,
): void {
  const tag = tagKeyOf(element);
  if (!tag) return;
  const content = element[tag];
  if (Array.isArray(content)) {
    visit(content as Child[]);
  } else if (isObject(content)) {
    visit([content as DomphyElement]);
  }
}

/**
 * Builds the replacement element wrapping the inline SVG. Domphy renders a
 * single-root HTML string as inline HTML, so the SVG markup becomes the `div`'s
 * content directly.
 */
function svgWrapper(svg: string, options: TreeOptions): DomphyElement {
  return {
    div: svg,
    class: options.className ?? "mermaid",
    ariaLabel: options.ariaLabel ?? "diagram",
  } as DomphyElement;
}

/**
 * Returns a new children array with mermaid code blocks replaced by SVG wrappers
 * and every other node recursively processed. The original tree is not mutated.
 */
function replaceInChildren(
  elements: Child[],
  svgBySource: Map<string, string>,
  options: TreeOptions,
): Child[] {
  return elements.map((element) => {
    if (!isObject(element)) return element;

    const record = element as ElementRecord;

    // A mermaid `<pre>` wraps a single mermaid `<code>` child. Detect the code
    // node either directly or one level down inside its `pre`.
    const directSource = isMermaidCode(record) ? extractSource(record) : null;
    if (directSource !== null) {
      const svg = svgBySource.get(directSource);
      return svg !== undefined ? svgWrapper(svg, options) : element;
    }

    const tag = tagKeyOf(record);
    if (tag === "pre") {
      const content = record.pre;
      const child = Array.isArray(content) ? content[0] : content;
      if (isObject(child) && isMermaidCode(child as ElementRecord)) {
        const source = extractSource(child as ElementRecord);
        if (source !== null) {
          const svg = svgBySource.get(source);
          if (svg !== undefined) return svgWrapper(svg, options);
        }
      }
    }

    if (tag && SELF_CONTAINED_VOID.has(tag)) return element;

    // Recurse into children, rebuilding the element with replaced content.
    return rebuildWithChildren(record, (children) =>
      replaceInChildren(children, svgBySource, options),
    );
  });
}

/**
 * Returns a shallow copy of `element` whose array/object content has been mapped
 * through `transform`. Preserves key order and all sibling attributes.
 */
function rebuildWithChildren(
  element: ElementRecord,
  transform: (children: Child[]) => Child[],
): DomphyElement {
  const tag = tagKeyOf(element);
  if (!tag) return element as DomphyElement;
  const content = element[tag];

  let nextContent: unknown = content;
  if (Array.isArray(content)) {
    nextContent = transform(content as Child[]);
  } else if (isObject(content)) {
    const [single] = transform([content as DomphyElement]);
    nextContent = single;
  }

  if (nextContent === content) return element as DomphyElement;
  return { ...element, [tag]: nextContent } as DomphyElement;
}

/**
 * Walks a Domphy element tree (as produced by `@domphy/markdown`), renders every
 * `mermaid` fenced code block to an inline SVG, and replaces each block with a
 * `div` wrapping that SVG. All other nodes — siblings, nesting, attributes — are
 * preserved unchanged.
 *
 * Diagrams are rendered concurrently (`Promise.all`) and identical sources are
 * rendered only once. Rendering goes through the on-disk cache by default; pass a
 * custom `renderer` (e.g. in tests) to avoid launching a browser.
 */
export async function renderMermaidInTree(
  elements: DomphyElement[],
  options: TreeOptions = {},
): Promise<DomphyElement[]> {
  const renderer: MermaidRenderer | undefined = options.renderer;

  // Pass 1: collect every distinct mermaid source in document order.
  const sources = new Set<string>();
  collectSources(elements as Child[], sources);

  if (sources.size === 0) {
    // Nothing to do: return the input untouched.
    return elements;
  }

  // Render each distinct source once, concurrently.
  const uniqueSources = [...sources];
  const svgList = await Promise.all(
    uniqueSources.map((source) =>
      renderer
        ? renderer(source, options)
        : renderMermaidCached(source, options),
    ),
  );

  const svgBySource = new Map<string, string>();
  uniqueSources.forEach((source, index) => {
    svgBySource.set(source, svgList[index]);
  });

  // Pass 2: rebuild the tree with mermaid blocks replaced.
  return replaceInChildren(
    elements as Child[],
    svgBySource,
    options,
  ) as DomphyElement[];
}
