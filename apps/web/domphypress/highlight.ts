// DomphyPress fenced-code highlighter built on shiki.
//
// `@domphy/markdown`'s walker wraps every fenced block in `<pre><code>` already,
// so the highlighter here must return ONLY the inner HTML of the `<code>`
// element — shiki's line/token spans without shiki's own `<pre><code>` wrapper.
// That string is handed back through the `Highlight` contract and rendered as
// the code element's HTML content.

import { type BundledLanguage, createHighlighter as createShiki } from "shiki";

// One light theme keeps the docs visually consistent and avoids shipping a dark
// theme the layout does not use.
const THEME = "github-light";

// Languages the docs actually use across markdown fences and `<<<` imports.
// `ts`/`js` are kept alongside `typescript`/`javascript` because file-extension
// derived languages (from the `<<<` rule) produce the short aliases.
const LANGUAGES: BundledLanguage[] = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "json",
  "bash",
  "shellscript",
  "html",
  "css",
  "vue",
  "markdown",
  "diff",
];

// Short aliases that map onto a loaded language. shiki registers `ts`/`js`/`sh`
// as aliases of their long forms when those languages are loaded, but we keep an
// explicit allow-list so unknown languages fall back to escaped plain text
// instead of throwing.
const ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  md: "markdown",
  yml: "yaml",
  htm: "html",
};

let highlighterPromise: ReturnType<typeof createShiki> | null = null;

/** Escapes text for safe inclusion as HTML content (unknown-language fallback). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Strips shiki's outer `<pre ...><code ...>` ... `</code></pre>` wrapper and
 * returns the inner HTML (the run of line spans). shiki always emits exactly one
 * `<pre>` wrapping one `<code>`, so a single non-greedy match is reliable.
 */
function unwrapCode(html: string): string {
  const match = html.match(/<code[^>]*>([\s\S]*)<\/code>/);
  return match ? match[1] : html;
}

/**
 * Initializes shiki once (lazy singleton) and returns a synchronous highlighter
 * matching `@domphy/markdown`'s `Highlight` contract: given raw code and a
 * language, it returns the inner HTML of the `<code>` element. Unknown languages
 * return escaped plain text so the block still renders.
 */
export async function createHighlighter(): Promise<
  (code: string, language: string) => string
> {
  if (!highlighterPromise) {
    highlighterPromise = createShiki({
      themes: [THEME],
      langs: LANGUAGES,
    });
  }
  const highlighter = await highlighterPromise;
  const loaded = new Set(highlighter.getLoadedLanguages());

  return (code: string, language: string): string => {
    const requested = (language || "").toLowerCase();
    const resolved = ALIASES[requested] ?? requested;

    if (!resolved || !loaded.has(resolved)) {
      // No language, or one shiki did not load: keep the code visible as plain
      // escaped text rather than dropping it.
      return escapeHtml(code);
    }

    const html = highlighter.codeToHtml(code, {
      lang: resolved,
      theme: THEME,
    });
    return unwrapCode(html);
  };
}
