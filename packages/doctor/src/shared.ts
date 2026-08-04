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

/** Returns the element's tag key (the first key that names a valid tag). */
export function findTag(element: Record<string, unknown>): string | undefined {
  for (const key in element) {
    if (TAGS.has(key)) return key;
  }
  return undefined;
}
