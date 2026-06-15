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
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}
