import { HtmlTags, SvgTags, VoidTags } from "@domphy/core";

// Core's raw-html marker — a RawHTML class instance is content, not an
// element tree, so walkers must not treat its keys as tag candidates.
export { isRawHTML } from "@domphy/core";

// Internal helpers shared by diagnose.ts and fix.ts. Kept in one module so the
// tag tables and the tree-shape predicates have a single source of truth.

/** Every valid HTML and SVG tag name. */
export const TAGS = new Set<string>([...HtmlTags, ...SvgTags]);

/** Tags that render no children (input, img, br, …). */
export const VOID = new Set<string>(VoidTags);

/**
 * Tags that exist only in the SVG namespace (g, rect, path, …). Tags shared
 * with HTML (svg itself, a, title, style, script) are deliberately excluded —
 * they are valid in both namespaces, so they are not a signal to skip HTML
 * content-model checks.
 */
export const SVG_ONLY = new Set<string>(
  SvgTags.filter((tag) => !HtmlTags.includes(tag)),
);

/** True for a non-array object (a Domphy element or a plain record). */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Keys that are never a tag: patches/partials put these before the host
 * tag (`type`, `_behaviors`, `style`, …). A later valid tag still counts
 * after these. A typo like `dvi` is a tag candidate and stops the walk
 * (`{ dvi, div }` has no tag — same spirit as core `validate()`).
 */
const TAG_SKIP = new Set([
  "$",
  "style",
  "_key",
  "_portal",
  "_context",
  "_metadata",
  "_behaviors",
  "_doctorDisable",
  "class",
  "id",
  "type",
  "role",
  "href",
  "src",
  "alt",
  "value",
  "name",
  "disabled",
  "readonly",
  "required",
  "checked",
  "selected",
  "hidden",
  "tabindex",
  "autocomplete",
  "placeholder",
]);

function isTagSkip(key: string): boolean {
  return (
    TAG_SKIP.has(key) ||
    key.startsWith("_on") ||
    key.startsWith("on") ||
    key.startsWith("data") ||
    key.startsWith("aria")
  );
}

/**
 * The element's tag: first own key that is a tag candidate.
 * `{ dvi: "typo", div: "ok" }` → no tag. `{ type: "button", button: "Go" }` → button.
 */
export function findTag(element: Record<string, unknown>): string | undefined {
  for (const key of Object.keys(element)) {
    if (isTagSkip(key)) continue;
    return TAGS.has(key) ? key : undefined;
  }
  return undefined;
}
