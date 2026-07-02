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
import { small } from "@domphy/ui";
import { preformated } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface CodeComparisonProps {
  /** Left/"before" panel source. */
  leftCode?: string;
  /** Right/"after" panel source. */
  rightCode?: string;
  /** Filename/label shown in the left panel header. Defaults to `"before.ts"`. */
  leftFilename?: string;
  /** Filename/label shown in the right panel header. Defaults to `"after.ts"`. */
  rightFilename?: string;
  /** Language identifier — used only as a fallback header label. Defaults to `"ts"`. */
  language?: string;
  /** Theme color family for `[!code highlight]` line tint. Defaults to `"warning"`. */
  highlightColor?: ThemeColor;
  style?: StyleObject;
}

type LineEmphasis = "none" | "highlight" | "add" | "remove" | "focus";
type TokenKind = "keyword" | "string" | "comment" | "number" | "plain";
type CodeToken = { text: string; kind: TokenKind };
type ParsedLine = { text: string; emphasis: LineEmphasis };

const KEYWORDS = new Set([
  // JS/TS
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "class", "extends", "new", "import", "from", "export", "default", "async",
  "await", "try", "catch", "finally", "throw", "switch", "case", "break",
  "continue", "typeof", "instanceof", "in", "of", "null", "undefined", "true",
  "false", "this", "super", "void", "yield", "interface", "type", "enum",
  "implements", "public", "private", "protected", "readonly", "static",
  // Python
  "def", "elif", "pass", "lambda", "as", "with", "None", "True", "False",
  "self", "raise", "except", "not", "and", "or", "is",
  // Rust/Go-ish
  "fn", "impl", "struct", "trait", "match", "mut", "pub", "use", "package",
  "func", "chan", "go", "defer",
]);

const MARKER_PATTERN = /[ \t]*(?:\/\/|#)\s*\[!code\s+(highlight|\+\+|--|focus)\]\s*$/;
const TOKEN_PATTERN =
  /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z0-9_$]+)/g;

function parseLine(rawLine: string): ParsedLine {
  const match = MARKER_PATTERN.exec(rawLine);
  if (!match) return { text: rawLine, emphasis: "none" };
  const marker = match[1];
  const emphasis: LineEmphasis =
    marker === "highlight" ? "highlight" : marker === "++" ? "add" : marker === "--" ? "remove" : "focus";
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
    else if (word) tokens.push({ text: word, kind: KEYWORDS.has(word) ? "keyword" : "plain" });
    else if (space) tokens.push({ text: space, kind: "plain" });
    else if (punctuation) tokens.push({ text: punctuation, kind: "plain" });
    match = TOKEN_PATTERN.exec(text);
  }
  return tokens.length > 0 ? tokens : [{ text: " ", kind: "plain" }];
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
  '  const message = `Hello ${name}`; // [!code ++]',
  '  console.log("Hello " + name); // [!code --]',
  "  console.log(message);",
  "}",
].join("\n");

/** One highlighted code panel: a small filename header above a token-colored `<pre><code>` block. */
function codePanel(
  code: string,
  filename: string,
  highlightColor: ThemeColor,
): DomphyElement<"div"> {
  const parsedLines = code.replace(/\r\n/g, "\n").split("\n").map(parseLine);
  const hasFocusedLine = parsedLines.some((line) => line.emphasis === "focus");

  const lineElements: DomphyElement[] = parsedLines.map((line, lineIndex) => {
    const tokenElements: DomphyElement[] = tokenizeLine(line.text).map((token, tokenIndex) => ({
      span: token.text,
      _key: `token-${tokenIndex}`,
      style: { color: (listener: Listener) => tokenColor(listener, token.kind) },
    }));

    const emphasized = line.emphasis !== "none" && line.emphasis !== "focus";
    const emphasisFamily: ThemeColor =
      line.emphasis === "add" ? "success" : line.emphasis === "remove" ? "error" : highlightColor;

    return {
      span: tokenElements,
      _key: `line-${lineIndex}`,
      // Only anchor a new tone surface for actually-tinted rows — plain
      // rows stay untouched (no dataTone, no backgroundColor override).
      ...(emphasized ? { dataTone: "shift-2" as const } : {}),
      style: {
        display: "block",
        whiteSpace: "pre",
        paddingInline: themeSpacing(4),
        opacity: hasFocusedLine ? (line.emphasis === "focus" ? 1 : 0.45) : 1,
        transition: "opacity 200ms ease, background-color 200ms ease",
        ...(emphasized
          ? {
              backgroundColor: (listener: Listener) => themeColor(listener, "inherit", emphasisFamily),
              color: (listener: Listener) => themeColor(listener, "shift-9", emphasisFamily),
            }
          : {}),
      } as StyleObject,
    } as DomphyElement;
  });

  return {
    div: [
      {
        small: filename,
        $: [small({ color: "neutral" })],
        style: {
          display: "block",
          paddingBlock: themeSpacing(2),
          paddingInline: themeSpacing(4),
          // Duplicates what the `small()` patch already sets — the doctor's
          // missing-color check only sees this element's own `style` object,
          // not merged patch styles, so `color` is repeated here to satisfy
          // the surface contract for the themed `borderBottom` below.
          color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
          borderBottom: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
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
      flex: `1 1 ${themeSpacing(80)}`,
      minWidth: 0,
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      outlineOffset: "-1px",
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
  const leftFilename = props.leftFilename ?? `before.${language}`;
  const rightFilename = props.rightFilename ?? `after.${language}`;
  const highlightColor = props.highlightColor ?? "warning";

  return {
    div: [
      codePanel(leftCode, leftFilename, highlightColor),
      codePanel(rightCode, rightFilename, highlightColor),
    ],
    style: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "stretch",
      gap: themeSpacing(4),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { codeComparison };
