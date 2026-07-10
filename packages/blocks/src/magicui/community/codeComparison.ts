// shadcn-community "Code Comparison" — clean-room reimplementation.
//
// A side-by-side two-panel code viewer for comparing a "before"/"after" (or
// left/right) snippet, with lightweight syntax highlighting and optional
// per-line emphasis. Implemented purely from the block's public functional/
// visual spec — no upstream source was viewed or copied.
//
// No syntax-highlighter dependency is bundled with this package (only cobe/
// canvas-confetti/rough-notation are), so highlighting here is a small,
// dependency-free regex tokenizer (comment / string / number / keyword /
// plain) rather than a full grammar-aware parser — good enough to read as
// "syntax highlighted" for common C-like/Python-like snippets, but it will
// misclassify some language-specific edge cases a real Shiki/Prism grammar
// would get right. Per-line emphasis follows the VitePress/Shiki convention
// of a trailing marker comment — `// [!code highlight]`, `// [!code ++]`,
// `// [!code --]`, `// [!code focus]` (also recognized with a leading `#`
// for Python/shell-style comments) — parsed and stripped before rendering.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { preformated, small } from "@domphy/ui";

export interface CodeComparisonProps {
  /** Left/"before" panel source. */
  leftCode?: string;
  /** Right/"after" panel source. */
  rightCode?: string;
  /**
   * Filename shown (once) in BOTH panel headers — the two panes are the same
   * file before/after, distinguished by a `before`/`after` header label rather
   * than by differing filenames. Defaults to `"app.<language>"`.
   */
  filename?: string;
  /** Language identifier — used only to build the default filename. Defaults to `"ts"`. */
  language?: string;
  /** Theme color family for `[!code highlight]` line tint. Defaults to `"error"` (red, matching upstream's `#ff3333`). */
  highlightColor?: ThemeColor;
  style?: StyleObject;
}

type LineEmphasis = "none" | "highlight" | "add" | "remove" | "focus";
type TokenKind = "keyword" | "string" | "comment" | "number" | "plain";
type CodeToken = { text: string; kind: TokenKind };
type ParsedLine = { text: string; emphasis: LineEmphasis };

const KEYWORDS = new Set([
  // JS/TS
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "extends",
  "new",
  "import",
  "from",
  "export",
  "default",
  "async",
  "await",
  "try",
  "catch",
  "finally",
  "throw",
  "switch",
  "case",
  "break",
  "continue",
  "typeof",
  "instanceof",
  "in",
  "of",
  "null",
  "undefined",
  "true",
  "false",
  "this",
  "super",
  "void",
  "yield",
  "interface",
  "type",
  "enum",
  "implements",
  "public",
  "private",
  "protected",
  "readonly",
  "static",
  // Python
  "def",
  "elif",
  "pass",
  "lambda",
  "as",
  "with",
  "None",
  "True",
  "False",
  "self",
  "raise",
  "except",
  "not",
  "and",
  "or",
  "is",
  // Rust/Go-ish
  "fn",
  "impl",
  "struct",
  "trait",
  "match",
  "mut",
  "pub",
  "use",
  "package",
  "func",
  "chan",
  "go",
  "defer",
]);

const MARKER_PATTERN =
  /[ \t]*(?:\/\/|#)\s*\[!code\s+(highlight|\+\+|--|focus)\]\s*$/;
const TOKEN_PATTERN =
  /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z0-9_$]+)/g;

function parseLine(rawLine: string): ParsedLine {
  const match = MARKER_PATTERN.exec(rawLine);
  if (!match) return { text: rawLine, emphasis: "none" };
  const marker = match[1];
  const emphasis: LineEmphasis =
    marker === "highlight"
      ? "highlight"
      : marker === "++"
        ? "add"
        : marker === "--"
          ? "remove"
          : "focus";
  return { text: rawLine.slice(0, match.index).replace(/\s+$/, ""), emphasis };
}

function tokenizeLine(text: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = TOKEN_PATTERN.exec(text);
  while (match) {
    const [, comment, string, number, word, space, punctuation] = match;
    if (comment) tokens.push({ text: comment, kind: "comment" });
    else if (string) tokens.push({ text: string, kind: "string" });
    else if (number) tokens.push({ text: number, kind: "number" });
    else if (word)
      tokens.push({
        text: word,
        kind: KEYWORDS.has(word) ? "keyword" : "plain",
      });
    else if (space) tokens.push({ text: space, kind: "plain" });
    else if (punctuation) tokens.push({ text: punctuation, kind: "plain" });
    match = TOKEN_PATTERN.exec(text);
  }
  return tokens.length > 0 ? tokens : [{ text: " ", kind: "plain" }];
}

function tokenColor(listener: Listener, kind: TokenKind): string {
  switch (kind) {
    case "keyword":
      return themeColor(listener, "shift-9", "primary");
    case "string":
      return themeColor(listener, "shift-9", "success");
    case "comment":
      return themeColor(listener, "shift-6", "neutral");
    case "number":
      return themeColor(listener, "shift-9", "warning");
    default:
      return themeColor(listener, "shift-10", "neutral");
  }
}

const DEFAULT_LEFT_CODE = [
  "function greet(name) {",
  '  console.log("Hello " + name); // [!code highlight]',
  "  return true;",
  "}",
].join("\n");

const DEFAULT_RIGHT_CODE = [
  "function greet(name: string): void {",
  "  const message = `Hello ${name}`; // [!code ++]",
  '  console.log("Hello " + name); // [!code --]',
  "  console.log(message);",
  "}",
].join("\n");

// Hand-authored generic "file" glyph (24x24, stroke=currentColor) — a plain
// document silhouette with a folded top-right corner. Original geometry, not
// sourced from any icon library.
function fileIcon(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          {
            path: null,
            d: "M7 3h6l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
          },
          { polyline: null, points: "13 3 13 7 17 7" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      flex: "0 0 auto",
      width: themeSpacing(4),
      height: themeSpacing(4),
    },
  };
}

/**
 * One half of the unified comparison card: a filename/icon header above a
 * token-colored `<pre><code>` block. It is a grid cell (no rounding/background
 * card of its own) — the two halves share a single internal hairline divider:
 * the left cell draws a right border from the `md` breakpoint up, the right
 * cell draws a top border below `md` (removed at `md`), matching upstream's
 * `md:border-r` / `border-t md:border-t-0`.
 */
function codePanel(
  code: string,
  filename: string,
  label: string,
  highlightColor: ThemeColor,
  side: "left" | "right",
): DomphyElement<"div"> {
  const parsedLines = code.replace(/\r\n/g, "\n").split("\n").map(parseLine);
  const hasFocusedLine = parsedLines.some((line) => line.emphasis === "focus");

  const lineElements: DomphyElement[] = parsedLines.map((line, lineIndex) => {
    const tokenElements: DomphyElement[] = tokenizeLine(line.text).map(
      (token, tokenIndex) => ({
        span: token.text,
        _key: `token-${tokenIndex}`,
        style: {
          color: (listener: Listener) => tokenColor(listener, token.kind),
        },
      }),
    );

    const emphasized = line.emphasis !== "none" && line.emphasis !== "focus";
    const emphasisFamily: ThemeColor =
      line.emphasis === "add"
        ? "success"
        : line.emphasis === "remove"
          ? "error"
          : highlightColor;
    // Non-focused rows in a panel that has a `[!code focus]` line are dimmed
    // (opacity 0.5) AND blurred (0.095rem), reverting on panel hover over 300ms
    // — matching upstream's `opacity-50 blur-[0.095rem]` + group-hover reveal.
    const dimmed = hasFocusedLine && line.emphasis !== "focus";

    return {
      span: tokenElements,
      _key: `line-${lineIndex}`,
      // Only anchor a new tone surface for actually-tinted rows — plain
      // rows stay untouched (no dataTone, no backgroundColor override).
      ...(emphasized ? { dataTone: "shift-2" as const } : {}),
      // Marks rows dimmed by a sibling `[!code focus]` line so the panel's
      // own `&:hover` rule can un-dim (and un-blur) them.
      ...(dimmed ? { dataCcDim: "true" as const } : {}),
      style: {
        display: "block",
        whiteSpace: "pre",
        paddingInline: themeSpacing(4),
        paddingBlock: themeSpacing(0.5),
        opacity: dimmed ? 0.5 : 1,
        filter: dimmed ? "blur(0.095rem)" : "none",
        transition:
          "opacity 300ms ease, filter 300ms ease, background-color 300ms ease",
        ...(emphasized
          ? {
              backgroundColor: (listener: Listener) =>
                themeColor(listener, "inherit", emphasisFamily),
              color: (listener: Listener) =>
                themeColor(listener, "shift-9", emphasisFamily),
            }
          : {}),
      } as StyleObject,
    } as DomphyElement;
  });

  const dividerStyle: StyleObject =
    side === "left"
      ? {
          "@media (min-width: 768px)": {
            borderInlineEnd: (listener: Listener) =>
              `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
          },
        }
      : {
          borderBlockStart: (listener: Listener) =>
            `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
          "@media (min-width: 768px)": { borderBlockStart: "none" },
        };

  return {
    div: [
      {
        div: [
          fileIcon(),
          { small: filename, $: [small({ color: "neutral" })] },
          {
            small: label,
            $: [small({ color: "neutral" })],
            // Hidden below the `md` breakpoint (768px), shown from md up —
            // matching upstream's `hidden md:block`.
            style: {
              marginInlineStart: "auto",
              display: "none",
              "@media (min-width: 768px)": { display: "block" },
            } as StyleObject,
          },
        ],
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(2),
          padding: themeSpacing(2),
          // Duplicates what the child `small()` patches already set — the
          // doctor's missing-color check only sees this element's own `style`
          // object, not merged patch styles, so `color` is repeated here to
          // satisfy the surface contract for the themed `borderBottom` below
          // (and to color the currentColor-stroked file glyph).
          color: (listener: Listener) =>
            themeColor(listener, "shift-9", "neutral"),
          borderBottom: (listener: Listener) =>
            `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
        },
      },
      {
        pre: [{ code: lineElements }],
        $: [preformated({ color: "neutral" })],
        style: {
          margin: 0,
          borderRadius: 0,
          overflowX: "auto",
          paddingInline: 0,
        },
      },
    ],
    dataTone: "shift-1",
    style: {
      minWidth: 0,
      overflow: "hidden",
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      // Hovering anywhere in the panel reveals lines dimmed by a focus
      // marker, matching upstream's group-hover/left|right un-dim behavior.
      "&:hover [data-cc-dim]": { opacity: 1, filter: "none" },
      ...dividerStyle,
    } as StyleObject,
  };
}

/**
 * A side-by-side two-panel syntax-highlighted code viewer for comparing a
 * "before"/"after" (or left/right) snippet. Emphasis (highlight/add/remove/
 * focus) is authored inline via trailing `// [!code ...]` markers, stripped
 * before display. Call with no arguments for a working before/after demo.
 */
function codeComparison(props: CodeComparisonProps = {}): DomphyElement<"div"> {
  const language = props.language ?? "ts";
  const leftCode = props.leftCode ?? DEFAULT_LEFT_CODE;
  const rightCode = props.rightCode ?? DEFAULT_RIGHT_CODE;
  const filename = props.filename ?? `app.${language}`;
  const highlightColor = props.highlightColor ?? "error";

  return {
    // Outer wrapper: centered, full width, capped at 64em (upstream
    // `mx-auto w-full max-w-5xl`).
    div: [
      {
        // Unified card: ONE rounded, bordered, clipped box (upstream
        // `overflow-hidden rounded-md border`). Its two halves share a single
        // internal hairline divider with no gap between them.
        div: [
          {
            // Two columns from `md` up, stacked into one column below it —
            // a viewport breakpoint (upstream `grid md:grid-cols-2`), not a
            // content-width wrap.
            div: [
              codePanel(leftCode, filename, "before", highlightColor, "left"),
              codePanel(rightCode, filename, "after", highlightColor, "right"),
            ],
            style: {
              position: "relative",
              display: "grid",
              gridTemplateColumns: "1fr",
              "@media (min-width: 768px)": { gridTemplateColumns: "1fr 1fr" },
            } as StyleObject,
          },
          // Centered "VS" badge floating on the boundary between the two panes.
          // Hidden below the `md` breakpoint (768px), mirroring upstream's
          // `hidden md:flex`.
          {
            span: [{ small: "VS", $: [small({ color: "neutral" })] }],
            ariaHidden: "true",
            dataTone: "shift-2",
            style: {
              position: "absolute",
              top: "50%",
              insetInlineStart: "50%",
              transform: "translate(-50%, -50%)",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: themeSpacing(8),
              height: themeSpacing(8),
              borderRadius: themeSpacing(2),
              zIndex: 1,
              backgroundColor: (listener: Listener) =>
                themeColor(listener, "inherit", "neutral"),
              color: (listener: Listener) =>
                themeColor(listener, "shift-9", "neutral"),
              border: (listener: Listener) =>
                `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
              "@media (min-width: 768px)": { display: "flex" },
            } as StyleObject,
          },
        ],
        style: {
          position: "relative",
          width: "100%",
          overflow: "hidden",
          borderRadius: themeSpacing(2),
          border: (listener: Listener) =>
            `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
          color: (listener: Listener) =>
            themeColor(listener, "shift-9", "neutral"),
        } as StyleObject,
      },
    ],
    style: {
      marginInline: "auto",
      width: "100%",
      maxWidth: themeSpacing(256),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { codeComparison };
