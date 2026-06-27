/**
 * Static a11y audit for Domphy element trees (plain objects).
 * Runs at build time or in Node — no Playwright required, zero dependencies.
 *
 * Rules:
 *   missing-alt        <img> without alt attribute
 *   missing-label      <input>/<textarea>/<select> without an accessible label
 *   heading-hierarchy  Heading level skipped (e.g. h1 → h3 is invalid)
 *   missing-lang       <html> element without the lang attribute
 *
 * Limitation: reactive content — `(listener) => value` — is not traversable
 * statically. The element's own props (alt, aria-label, etc.) are still
 * checked, but any child elements returned by a reactive function are skipped.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type A11yRule =
  | "missing-alt"
  | "missing-label"
  | "heading-hierarchy"
  | "missing-lang";

export interface A11yIssue {
  /** Which rule fired */
  rule: A11yRule;
  /** Human-readable description of the violation */
  message: string;
  /** Dot-path through the element tree pointing to the offending element */
  path: string;
}

export interface A11yResult {
  /** false when issues.length > 0 */
  ok: boolean;
  issues: A11yIssue[];
}

// ---------------------------------------------------------------------------
// Tag registry
// ---------------------------------------------------------------------------

// Full set of HTML + common SVG tags recognised as Domphy host-key candidates.
// Mirrors @domphy/core HtmlTags / SvgTags plus document-level tags.
// Kept inline so @domphy/audit stays zero-dep.
const ALL_TAGS = new Set<string>([
  // Document-level (not in core HtmlTags but may appear in full-document trees)
  "html", "head", "body", "script", "noscript", "title",
  // HTML elements
  "a", "abbr", "address", "area", "article", "aside", "audio",
  "b", "base", "bdi", "bdo", "blockquote", "br", "button",
  "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
  "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr",
  "i", "iframe", "img", "input", "ins",
  "kbd",
  "label", "legend", "li", "link",
  "main", "map", "mark", "math", "menu", "meta", "meter",
  "nav",
  "object", "ol", "optgroup", "option", "output",
  "p", "param", "picture", "pre", "progress",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "search", "section", "select", "slot", "small", "source",
  "span", "strong", "style", "sub", "summary", "sup",
  "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead",
  "time", "tr", "track",
  "u", "ul",
  "var", "video",
  "wbr",
  // Common SVG elements
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline",
  "polygon", "text", "tspan", "textPath", "defs", "use", "symbol",
  "clipPath", "mask", "image", "pattern", "linearGradient",
  "radialGradient", "stop", "marker", "animate", "animateMotion",
  "animateTransform", "set", "desc", "view", "filter",
  "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
  "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap",
  "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB",
  "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge",
  "feMergeNode", "feMorphology", "feOffset", "fePointLight",
  "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence",
  "foreignObject", "metadata", "mpath", "prefetch", "solidColor",
  "switch", "tbreak", "cursor",
]);

const HEADING_LEVEL: Readonly<Record<string, number>> = {
  h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6,
};

const FORM_CONTROL_TAGS = new Set<string>(["input", "textarea", "select"]);

// Input types that carry an accessible name through their own value/alt:
// submit and reset get their label from their value attribute;
// image buttons require an alt attribute (covered by the missing-alt rule);
// button type and hidden type need no label association.
const SELF_LABELED_TYPES = new Set<string>([
  "submit", "reset", "button", "image", "hidden",
]);

// ---------------------------------------------------------------------------
// Internal tree walker
// ---------------------------------------------------------------------------

/** Returns the host-tag of a Domphy element object (first recognised tag key). */
function findTag(obj: Record<string, unknown>): string | undefined {
  for (const key in obj) {
    if (ALL_TAGS.has(key)) return key;
  }
  return undefined;
}

interface WalkContext {
  images: Array<{ obj: Record<string, unknown>; path: string }>;
  formControls: Array<{
    tag: string;
    obj: Record<string, unknown>;
    path: string;
    isInsideLabel: boolean;
  }>;
  /** All <label> for-IDs found in the tree */
  labelForIds: Set<string>;
  headings: Array<{ level: number; path: string }>;
  htmlElement: { obj: Record<string, unknown>; path: string } | null;
}

function walk(
  value: unknown,
  path: string,
  context: WalkContext,
  isInsideLabel: boolean,
): void {
  if (value === null || value === undefined) return;
  // Reactive functions — content is not statically knowable; skip subtree
  if (typeof value === "function") return;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      walk(value[index], `${path}[${index}]`, context, isInsideLabel);
    }
    return;
  }

  if (typeof value !== "object") return;

  const obj = value as Record<string, unknown>;
  const tag = findTag(obj);
  if (!tag) return;

  // ---- Collect data for each rule ----

  if (tag === "html") {
    context.htmlElement = { obj, path };
  }

  if (tag === "img") {
    context.images.push({ obj, path });
  }

  if (FORM_CONTROL_TAGS.has(tag)) {
    const inputType =
      typeof obj["type"] === "string" ? obj["type"].toLowerCase() : "";
    if (!SELF_LABELED_TYPES.has(inputType)) {
      context.formControls.push({ tag, obj, path, isInsideLabel });
    }
  }

  if (tag === "label") {
    const forAttr = obj["for"] ?? obj["htmlFor"];
    if (typeof forAttr === "string" && forAttr) {
      context.labelForIds.add(forAttr);
    }
  }

  if (tag in HEADING_LEVEL) {
    context.headings.push({ level: HEADING_LEVEL[tag]!, path });
  }

  // ---- Recurse into children ----
  const childIsInsideLabel = isInsideLabel || tag === "label";
  const content = obj[tag];
  walk(content, `${path}>${tag}`, context, childIsInsideLabel);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all static a11y rules against a Domphy element tree.
 *
 * ```ts
 * import { auditA11y } from "@domphy/audit"
 *
 * const App = {
 *   div: [
 *     { img: null, src: "logo.png" },          // missing alt → flagged
 *     { input: null, type: "text" },            // missing label → flagged
 *     { h1: "Title" },
 *     { h3: "Subtitle" },                       // skipped h2 → flagged
 *   ],
 * }
 *
 * const result = auditA11y(App)
 * console.log(result.ok)      // false
 * console.log(result.issues)  // A11yIssue[]
 * ```
 *
 * Works on any Domphy element (plain object, array of elements, or a full
 * document tree). No Playwright or browser required.
 */
export function auditA11y(element: unknown): A11yResult {
  const context: WalkContext = {
    images: [],
    formControls: [],
    labelForIds: new Set(),
    headings: [],
    htmlElement: null,
  };

  walk(element, "root", context, false);

  const issues: A11yIssue[] = [];

  // ---- Rule: missing-lang ----
  // The <html> element must declare the page language so screen readers
  // can select the correct speech-synthesis voice and pronunciation rules.
  if (context.htmlElement) {
    const el = context.htmlElement;
    if (!("lang" in el.obj) && !("xmlLang" in el.obj)) {
      issues.push({
        rule: "missing-lang",
        message:
          '<html> is missing the lang attribute — screen readers need it to select the correct speech language (e.g. lang="en")',
        path: el.path,
      });
    }
  }

  // ---- Rule: missing-alt ----
  // Every <img> must have an alt attribute. Use alt="" for purely decorative
  // images so screen readers skip them; use a descriptive string for images
  // that convey meaning.
  for (const { obj, path } of context.images) {
    if (!("alt" in obj)) {
      const srcHint =
        typeof obj["src"] === "string"
          ? ` (src: "${obj["src"].slice(0, 40)}")`
          : "";
      issues.push({
        rule: "missing-alt",
        message: `<img>${srcHint} is missing the alt attribute — add alt="" for decorative images or a descriptive string for meaningful ones`,
        path,
      });
    }
  }

  // ---- Rule: missing-label ----
  // Every interactive form control needs an accessible name. Accepted sources
  // (in evaluation order): nesting inside <label>, a sibling <label for="id">,
  // aria-label, aria-labelledby, or title (WCAG 4.1.2 accessible name fallback).
  for (const { tag, obj, path, isInsideLabel } of context.formControls) {
    if (isInsideLabel) continue;

    const elementId = typeof obj["id"] === "string" ? obj["id"] : "";
    if (elementId && context.labelForIds.has(elementId)) continue;

    if ("aria-label" in obj) continue;
    if ("aria-labelledby" in obj) continue;
    if ("title" in obj) continue;

    const typeHint =
      typeof obj["type"] === "string" ? ` type="${obj["type"]}"` : "";
    issues.push({
      rule: "missing-label",
      message: `<${tag}${typeHint}> has no accessible label — add aria-label, aria-labelledby, or associate a <label for="...">`,
      path,
    });
  }

  // ---- Rule: heading-hierarchy ----
  // Heading levels must not skip: h1 → h3 is invalid (missing h2). Jumping to
  // a shallower level (h3 → h1) is always allowed — hierarchy only restricts
  // going deeper.
  let previousLevel = 0;
  for (const { level, path } of context.headings) {
    if (previousLevel > 0 && level > previousLevel + 1) {
      issues.push({
        rule: "heading-hierarchy",
        message: `Heading hierarchy skips from h${previousLevel} to h${level} — insert an h${previousLevel + 1} to maintain a logical document outline (WCAG 1.3.1)`,
        path,
      });
    }
    previousLevel = level;
  }

  return { ok: issues.length === 0, issues };
}
