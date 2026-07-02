// Aceternity UI "Code Block" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A dark
// editor-style panel: a tab-bar header (filename + optional file icon per
// tab, a trailing copy button), and a line-numbered, syntax-tinted body
// below with optional per-line highlight accents.
//
// No syntax-highlighter dependency ships with this package (only cobe/
// canvas-confetti/rough-notation do — see this package's own
// `codeComparison.ts`, which the tokenizer below is intentionally identical
// to, duplicated rather than imported since block files in this package are
// self-contained). It's a small, dependency-free regex tokenizer (comment /
// string / number / keyword / plain), good enough to read as "syntax
// highlighted" for common C-like/Python-like snippets, not a full
// grammar-aware parser.
//
// Tab switching and the copy button's checkmark feedback are both
// `toState`-driven; the tab body's cross-fade is a plain opacity toggle
// (0 → new content painted → 1) sequenced through a double
// `requestAnimationFrame` so the browser actually paints the opacity-0 frame
// before animating back in — the same "force a paint between state change
// and the next visual step" idiom this package's other components use for
// responsiveness, repurposed here for a visible fade instead. The
// copy-to-clipboard revert delay (2000ms) is a reasonable default, not a
// confirmed upstream value — see this file's own `fidelityNotes`.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { buttonGhost } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface CodeBlockTab {
  /** Tab label shown in the header (also used as the file-type hint). */
  filename: string;
  /** Raw source text for this tab. */
  code: string;
  /** Language identifier — stored for callers/tooling; the bundled
   * tokenizer is generic and does not branch on it. */
  language?: string;
  /** 1-based line numbers that get a tinted background + left accent. */
  highlightLines?: number[];
}

export interface CodeBlockProps {
  /** Single-snippet mode: raw source text. Ignored when `tabs` is set. */
  code?: string;
  /** Single-snippet mode: tab label. Defaults to `"index.ts"`. */
  filename?: string;
  /** Single-snippet mode: language identifier (label/metadata only). Defaults to `"ts"`. */
  language?: string;
  /** Single-snippet mode: 1-based highlighted line numbers. */
  highlightLines?: number[];
  /** Multi-tab mode: overrides `code`/`filename`/`language`/`highlightLines`. */
  tabs?: CodeBlockTab[];
  /** Theme color family for highlighted-line tint and the active tab's underline. Defaults to `"warning"`. */
  highlightColor?: ThemeColor;
  /** Extra class name merged onto the outer panel. */
  className?: string;
  style?: StyleObject;
}

type TokenKind = "keyword" | "string" | "comment" | "number" | "plain";
type CodeToken = { text: string; kind: TokenKind };

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "class", "extends", "new", "import", "from", "export", "default", "async",
  "await", "try", "catch", "finally", "throw", "switch", "case", "break",
  "continue", "typeof", "instanceof", "in", "of", "null", "undefined", "true",
  "false", "this", "super", "void", "yield", "interface", "type", "enum",
  "implements", "public", "private", "protected", "readonly", "static",
  "def", "elif", "pass", "lambda", "as", "with", "None", "True", "False",
  "self", "raise", "except", "not", "and", "or", "is",
  "fn", "impl", "struct", "trait", "match", "mut", "pub", "use", "package",
  "func", "chan", "go", "defer",
]);

const TOKEN_PATTERN =
  /(\/\/[^\n]*|#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z0-9_$]+)/g;

const COPY_FEEDBACK_DURATION_MS = 2000;

const DEFAULT_TABS: CodeBlockTab[] = [
  {
    filename: "greet.ts",
    language: "ts",
    code: [
      "export function greet(name: string): string {",
      '  const message = `Hello, ${name}!`;',
      "  console.log(message);",
      "  return message;",
      "}",
    ].join("\n"),
    highlightLines: [2],
  },
  {
    filename: "index.ts",
    language: "ts",
    code: ['import { greet } from "./greet";', "", 'greet("Domphy");'].join("\n"),
  },
];

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

/** Small generic "file" glyph — an outlined page with a folded corner. */
function fileGlyph(): DomphyElement<"svg"> {
  return {
    svg: [
      { path: null, d: "M6 2.5h6l4 4v13.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" },
      { path: null, d: "M12 2.5v4h4", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinejoin: "round" },
    ],
    viewBox: "0 0 24 24",
    ariaHidden: "true",
    style: { display: "block", width: themeSpacing(3.5), height: themeSpacing(3.5) } as StyleObject,
  } as DomphyElement<"svg">;
}

/** Two overlapping rounded rectangles — a generic "copy" glyph. */
function copyGlyph(): DomphyElement<"svg"> {
  return {
    svg: [
      { rect: null, x: "8", y: "8", width: "12", height: "12", rx: "2", fill: "none", stroke: "currentColor", strokeWidth: "1.8" },
      { path: null, d: "M4 15V5a2 2 0 0 1 2-2h10", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" },
    ],
    viewBox: "0 0 24 24",
    ariaHidden: "true",
    style: { display: "block", width: themeSpacing(4), height: themeSpacing(4) } as StyleObject,
  } as DomphyElement<"svg">;
}

/** A simple checkmark — swapped in for `copyGlyph()` as copy confirmation. */
function checkGlyph(): DomphyElement<"svg"> {
  return {
    svg: [{ path: null, d: "M5 13l4 4L19 7", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }],
    viewBox: "0 0 24 24",
    ariaHidden: "true",
    style: { display: "block", width: themeSpacing(4), height: themeSpacing(4) } as StyleObject,
  } as DomphyElement<"svg">;
}

/** Runs `callback` after two animation frames, so a style change made just
 * before calling this has already been painted — falls back to two
 * zero-delay timeouts where `requestAnimationFrame` isn't available (SSR). */
function afterTwoFrames(callback: () => void): void {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    setTimeout(() => setTimeout(callback, 0), 0);
    return;
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

function buildLineElements(tab: CodeBlockTab, highlightColor: ThemeColor): DomphyElement[] {
  const lines = tab.code.replace(/\r\n/g, "\n").split("\n");
  const highlightedLines = new Set(tab.highlightLines ?? []);
  const gutterDigitCount = String(lines.length).length;

  return lines.map((lineText, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const isHighlighted = highlightedLines.has(lineNumber);
    const tokenElements: DomphyElement[] = tokenizeLine(lineText).map((token, tokenIndex) => ({
      span: token.text,
      _key: `token-${tokenIndex}`,
      style: { color: (listener: Listener) => tokenColor(listener, token.kind) },
    }));

    return {
      span: [
        {
          span: String(lineNumber).padStart(gutterDigitCount, " "),
          ariaHidden: "true",
          style: {
            display: "inline-block",
            width: `${gutterDigitCount + 1}ch`,
            flexShrink: 0,
            paddingInlineEnd: themeSpacing(3),
            textAlign: "right",
            userSelect: "none",
            color: (listener: Listener) => themeColor(listener, "shift-6", "neutral"),
          } as StyleObject,
        },
        { span: tokenElements, style: { whiteSpace: "pre" } as StyleObject },
      ],
      _key: `line-${lineIndex}`,
      ...(isHighlighted ? { dataTone: "shift-2" as const } : {}),
      style: {
        display: "flex",
        paddingInlineEnd: themeSpacing(4),
        borderInlineStart: (listener: Listener) =>
          `${themeSpacing(1)} solid ${isHighlighted ? themeColor(listener, "shift-9", highlightColor) : "transparent"}`,
        ...(isHighlighted
          ? {
              backgroundColor: (listener: Listener) => themeColor(listener, "inherit", highlightColor),
              color: (listener: Listener) => themeColor(listener, "shift-9", highlightColor),
            }
          : {}),
      } as StyleObject,
    } as DomphyElement;
  });
}

/**
 * A dark editor-style code panel: a tab-bar header (filename + copy button)
 * over a line-numbered, syntax-tinted body with optional per-line highlight
 * accents. Call with no arguments for a working demo — two linked TS tabs
 * with one highlighted line.
 */
function codeBlock(props: CodeBlockProps = {}): DomphyElement<"div"> {
  const highlightColor = props.highlightColor ?? "warning";

  const tabs: CodeBlockTab[] =
    props.tabs && props.tabs.length > 0
      ? props.tabs
      : props.code !== undefined
        ? [
            {
              filename: props.filename ?? `index.${props.language ?? "ts"}`,
              code: props.code,
              language: props.language ?? "ts",
              highlightLines: props.highlightLines,
            },
          ]
        : DEFAULT_TABS;

  const activeTabIndex = toState(0);
  const copied = toState(false);
  const bodyOpacity = toState(1);

  const switchTab = (index: number) => {
    if (activeTabIndex.get() === index) return;
    bodyOpacity.set(0);
    activeTabIndex.set(index);
    afterTwoFrames(() => bodyOpacity.set(1));
  };

  let pendingCopyRevertTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleCopyClick = () => {
    const text = tabs[activeTabIndex.get()].code;
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard || typeof clipboard.writeText !== "function") return;
    clipboard
      .writeText(text)
      .then(() => {
        copied.set(true);
        if (pendingCopyRevertTimeout) clearTimeout(pendingCopyRevertTimeout);
        pendingCopyRevertTimeout = setTimeout(() => {
          pendingCopyRevertTimeout = null;
          copied.set(false);
        }, COPY_FEEDBACK_DURATION_MS);
      })
      .catch(() => {
        // Clipboard write rejected (denied permission, insecure context, …) —
        // fail silently rather than surface a broken confirmation state.
      });
  };

  const tabButtons: DomphyElement<"button">[] = tabs.map((tab, index) => ({
    button: [
      { span: [fileGlyph()], ariaHidden: "true", style: { display: "flex" } },
      { span: tab.filename },
    ],
    type: "button",
    _key: `${tab.filename}-${index}`,
    onClick: () => switchTab(index),
    $: [buttonGhost({ color: "neutral" })],
    style: {
      flexShrink: 0,
      gap: themeSpacing(2),
      borderRadius: 0,
      paddingBlock: themeSpacing(2.5),
      paddingInline: themeSpacing(4),
      opacity: (listener: Listener) => (activeTabIndex.get(listener) === index ? 1 : 0.55),
      // Always resolve through the ambient tab-bar surface (the header's own
      // `dataTone: "shift-16"`) instead of a fixed absolute tone — active vs.
      // inactive is already conveyed by opacity + the underline below, so the
      // background doesn't need its own separate highlight tone.
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      borderBlockEnd: (listener: Listener) =>
        `${themeSpacing(0.5)} solid ${activeTabIndex.get(listener) === index ? themeColor(listener, "shift-9", highlightColor) : "transparent"}`,
    } as StyleObject,
  })) as DomphyElement<"button">[];

  const copyButton: DomphyElement<"button"> = {
    button: [
      { span: [copyGlyph()], ariaHidden: "true", style: { display: (listener: Listener) => (copied.get(listener) ? "none" : "flex") } as StyleObject },
      { span: [checkGlyph()], ariaHidden: "true", style: { display: (listener: Listener) => (copied.get(listener) ? "flex" : "none") } as StyleObject },
    ],
    type: "button",
    ariaLabel: "Copy code",
    onClick: handleCopyClick,
    $: [buttonGhost({ color: "neutral" })],
    style: { marginInlineStart: "auto", flexShrink: 0 } as StyleObject,
  } as DomphyElement<"button">;

  const header: DomphyElement<"div"> = {
    div: [...tabButtons, copyButton],
    dataTone: "shift-16",
    style: {
      display: "flex",
      alignItems: "center",
      overflowX: "auto",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    } as StyleObject,
  } as DomphyElement<"div">;

  const body: DomphyElement<"div"> = {
    div: [
      {
        pre: [{ code: (listener: Listener) => buildLineElements(tabs[activeTabIndex.get(listener)], highlightColor) }],
        // No typography patch/override here — `<pre>` is monospace by the
        // browser's own UA stylesheet, so nothing needs setting.
        style: { margin: 0, borderRadius: 0 } as StyleObject,
      },
    ],
    style: {
      overflowX: "auto",
      paddingBlock: themeSpacing(3),
      opacity: (listener: Listener) => bodyOpacity.get(listener),
      transition: "opacity 150ms ease",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [header, body],
    // Only set `class` when a className was actually passed — an explicit
    // `class: undefined` would overwrite (not skip) the auto-generated
    // per-node style class ElementNode.merge() seeds at construction,
    // silently dropping this element's own `style: {}` from the DOM.
    ...(props.className ? { class: props.className } : {}),
    dataTone: "shift-17",
    _onRemove: () => {
      if (pendingCopyRevertTimeout) clearTimeout(pendingCopyRevertTimeout);
    },
    style: {
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-14")}`,
      outlineOffset: "-1px",
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { codeBlock };
