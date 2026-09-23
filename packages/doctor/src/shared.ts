import {
  HtmlTags,
  isCustomElementName,
  merge,
  SvgTags,
  VoidTags,
} from "@domphy/core";

// Core owns the HTML Standard valid-custom-element-name production — doctor
// re-exports it so every rule asks the runtime what a custom element is.
export { isCustomElementName };

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
 * The element's tag: first own key that is a tag candidate. A valid custom
 * element name counts — core renders those as real elements.
 * `{ dvi: "typo", div: "ok" }` → no tag. `{ type: "button", button: "Go" }` → button.
 */
export function findTag(element: Record<string, unknown>): string | undefined {
  for (const key of Object.keys(element)) {
    if (isTagSkip(key)) continue;
    if (TAGS.has(key)) return key;
    // A hyphenated key is also the shape of a kebab-case attribute
    // (http-equiv, accept-charset). Core's getTagName() resolves built-in tags
    // first, so a later built-in key wins here too — same element, same tag.
    if (isCustomElementName(key)) {
      return Object.keys(element).find((other) => TAGS.has(other)) ?? key;
    }
    return undefined;
  }
  return undefined;
}

/**
 * The element's EFFECTIVE props: every `$` patch applied the way core's
 * `ElementNode`/`mergePartial` does — each patch expanded first, composed left
 * to right, then the native element merged last so it wins. Core's own
 * `merge()` does the merging, so the semantics that matter (comma/space joins
 * for `boxShadow`/`class`, nested style objects, `_behaviors` records, null
 * skipping) have a single source of truth and cannot drift.
 *
 * Returns the input unchanged when there is no `$`, so callers can use it
 * unconditionally.
 *
 * Two deliberate differences from core's `mergePartial`:
 *  - it does not mutate the input (core `delete`s `$` off the descriptor it was
 *    handed; doctor is handed the caller's live tree);
 *  - when the native element declares the content key, that content is carried
 *    through by REFERENCE and re-attached after the merge. Core's
 *    `cloneDescriptor` does the same, for the same two reasons: `merge()` deep
 *    clones its target, so a subtree would be cloned once per ancestor, and a
 *    declared `tag: null` (which `merge()` skips, being null) is the
 *    "decorative host, no text" signal several rules read.
 */
// Own cost measured in isolation from module-import time by
// packages/doctor/scripts/measure-expand-patches.ts (`pnpm measure:expand-
// patches`): ~37-44 µs/call on a 2-level composed element, repeated over
// 200k calls. The 192-file/90-file CLI-scan benchmarks import a whole module
// graph per file, which dwarfs this — they were never evidence about this
// function specifically.
export function expandPatches(
  element: Record<string, unknown>,
  contentKey?: string,
): Record<string, unknown> {
  if (!Array.isArray(element.$)) return element;
  const effective: Record<string, unknown> = {};
  for (const patch of element.$) {
    if (isPlainObject(patch)) merge(effective, expandPatches(patch));
  }
  const native: Record<string, unknown> = { ...element };
  delete native.$;
  const nativeContent = contentKey !== undefined && contentKey in native;
  if (nativeContent) delete native[contentKey];
  // `_doctorDisable` is doctor's own annotation; core's merge() treats it as an
  // ordinary scalar, so a native entry REPLACES the patch's and silently drops
  // the patch author's suppression (card() disables inline-typography for its
  // own heading-slot fontWeight — any host adding its own entry lost that, and
  // the host's entry then read as stale). Both sides are honored instead.
  const disable = unionDisable(effective._doctorDisable, native._doctorDisable);
  delete native._doctorDisable;
  merge(effective, native);
  if (disable !== undefined) effective._doctorDisable = disable;
  if (nativeContent) {
    effective[contentKey as string] = element[contentKey as string];
  }
  return effective;
}

/** Union of two `_doctorDisable` annotations: `true` (all rules) absorbs lists. */
function unionDisable(patch: unknown, native: unknown): unknown {
  const off = (value: unknown) =>
    value === undefined || value === null || value === false;
  if (off(patch)) return off(native) ? (native ?? patch) : native;
  if (off(native)) return patch;
  if (patch === true || native === true) return true;
  const list = (value: unknown): string[] =>
    Array.isArray(value) ? value.map(String) : [String(value)];
  return [...new Set([...list(patch), ...list(native)])];
}
