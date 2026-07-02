/**
 * Default slug function for heading anchors. Lowercases, strips characters that
 * are not word characters, spaces, or hyphens, then collapses whitespace runs
 * into single hyphens. Matches the common GitHub-style anchor convention well
 * enough for in-page navigation without pulling in a transliteration library.
 */
export function defaultSlugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N} \-_]/gu, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns a slugify function that guarantees uniqueness across a document by
 * appending `-1`, `-2`, ... to slugs that have already been produced. The
 * returned function is stateful and should be created once per parse.
 */
export function createUniqueSlugger(
  slugify: (text: string) => string,
): (text: string) => string {
  const seen = new Set<string>();
  return (text: string): string => {
    const base = slugify(text) || "section";
    let candidate = base;
    let count = 0;
    // Track issued slugs directly (not per-base counters) so a later heading
    // can't collide with an earlier `base-N` that was itself a base slug.
    while (seen.has(candidate)) {
      count++;
      candidate = `${base}-${count}`;
    }
    seen.add(candidate);
    return candidate;
  };
}
