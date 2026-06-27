/**
 * Built-in markdown-it plugin for LaTeX math expressions.
 *
 * Supports two syntaxes:
 *  - Inline:  $...$ → token type "math_inline" → { span: latex, class: "math math-inline" }
 *  - Display: $$...$$ (block) → token type "math_block" → { div: latex, class: "math math-display" }
 *
 * No heavy bundled renderer — the raw LaTeX is preserved so a CDN-loaded
 * KaTeX auto-render extension or MathJax can process it client-side.
 *
 * Usage:
 *   import { mathPlugin } from "./math.js"
 *   md.use(mathPlugin)
 *
 * Then load on the page:
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
 *   <script defer src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
 *   <script defer src="https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js"
 *     onload="renderMathInElement(document.body)"></script>
 */
import type MarkdownIt from "markdown-it";

// Inline state type — not exported by @types/markdown-it so we type what we need.
interface InlineState {
  src: string;
  pos: number;
  posMax: number;
  pending: string;
  push(type: string, tag: string, nesting: number): { content: string; markup: string };
}

// Block state type — not exported by @types/markdown-it so we type what we need.
interface BlockState {
  src: string;
  bMarks: number[];
  eMarks: number[];
  tShift: number[];
  sCount: number[];
  blkIndent: number;
  line: number;
  lineMax: number;
  skipSpaces(pos: number): number;
  getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string;
  push(type: string, tag: string, nesting: number): { content: string; markup: string; map: [number, number] | null };
}

/**
 * Inline math rule: $...$ (single dollar delimiters).
 * Double-dollar at the start ($$) is reserved for block math — skip it.
 * Escaped dollar signs (\$) are ignored by normal markdown-it escape handling
 * which runs before this rule.
 */
function mathInlineRule(state: InlineState, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) return false;
  // Skip $$ — block math syntax or literal pair
  if (state.src.charCodeAt(state.pos + 1) === 0x24) return false;

  const start = state.pos + 1;
  let pos = start;

  while (pos <= state.posMax) {
    const ch = state.src.charCodeAt(pos);
    if (ch === 0x24 /* $ */ && state.src.charCodeAt(pos - 1) !== 0x5c /* \ */) {
      // Found the closing $
      if (!silent) {
        const token = state.push("math_inline", "span", 0);
        token.markup = "$";
        token.content = state.src.slice(start, pos);
      }
      state.pos = pos + 1;
      return true;
    }
    pos++;
  }

  // No closing $ found — treat the opening $ as literal text
  if (!silent) state.pending += "$";
  state.pos++;
  return false;
}

/**
 * Block math rule: $$...$$ on their own lines.
 *
 * Opening line: exactly "$$" (optionally followed by language/info text)
 * Closing line: exactly "$$"
 * Content: everything between the two delimiter lines.
 *
 * Example:
 *   $$
 *   E = mc^2
 *   $$
 */
function mathBlockRule(
  state: BlockState,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];

  // Must start with $$
  if (
    state.src.charCodeAt(start) !== 0x24 ||
    state.src.charCodeAt(start + 1) !== 0x24
  ) {
    return false;
  }

  // Reject if indented 4+ spaces (would be a code block)
  if (state.sCount[startLine] - state.blkIndent >= 4) return false;

  // Content after the opening $$ on the same line (optional info string)
  const openingRest = state.src.slice(start + 2, max).trim();
  // Reject if $$ appears again on the same opening line (not our syntax)
  if (openingRest.includes("$$")) return false;

  if (silent) return true;

  // Find the closing $$
  let nextLine = startLine + 1;
  let found = false;

  while (nextLine < endLine) {
    const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
    const lineEnd = state.eMarks[nextLine];
    const line = state.src.slice(lineStart, lineEnd).trim();
    if (line === "$$") {
      found = true;
      break;
    }
    nextLine++;
  }

  if (!found) return false;

  const contentEnd = nextLine;
  state.line = nextLine + 1;

  const token = state.push("math_block", "div", 0);
  token.content = state.getLines(startLine + 1, contentEnd, 0, true);
  token.markup = "$$";
  token.map = [startLine, state.line];

  return true;
}

/**
 * Installs the math plugin on a markdown-it instance.
 * After installing, fenced `$$` blocks produce `math_block` tokens
 * and `$...$` spans produce `math_inline` tokens.
 * The walker in walker.ts converts these to Domphy elements.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mathPlugin(md: MarkdownIt): void {
  // Block rule runs before fence so $$ blocks are not consumed as fences
  md.block.ruler.before(
    "fence",
    "math_block",
    mathBlockRule as Parameters<typeof md.block.ruler.before>[2],
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );

  // Inline rule runs after escape so \$ is already handled
  md.inline.ruler.after(
    "escape",
    "math_inline",
    mathInlineRule as Parameters<typeof md.inline.ruler.after>[2],
  );
}
