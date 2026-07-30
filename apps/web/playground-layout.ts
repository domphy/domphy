/**
 * Docs pages with a live CodeEditor playground need horizontal room for the
 * Code | Preview split. Hide the TOC aside so content expands into that column
 * (see `@domphy/press` pageShell: `!showAside && showSidebar` → content maxWidth
 * none). Keep the left nav sidebar — do not set `sidebar: false` or `layout: page`.
 *
 * Opt out with frontmatter `aside: true` when a page wants both playground + TOC.
 */
export function applyPlaygroundLayout(
  frontmatter: Record<string, unknown>,
  hasPlayground: boolean,
): void {
  if (!hasPlayground) return;
  if (frontmatter.aside === true) return;
  frontmatter.aside = false;
}
