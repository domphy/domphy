import { ElementNode } from "@domphy/core";
import {
  CONTRAST_SPAN,
  cssRgbToRgb,
  type ElementTone,
  ElementTones,
  hexToRgb,
  labToLch,
  resolveToneStep,
  rgbToLab,
  TONE_STEPS,
  ToneAliases,
} from "@domphy/theme";
import {
  expandPatches,
  findTag,
  isCustomElementName,
  isPlainObject,
  isRawHTML,
  SVG_ONLY,
  TAGS,
  VOID,
} from "./shared.js";

export type Severity = "error" | "warning" | "info";

/**
 * Broad structural category for a rule. Mirrors Biome's lint category model.
 * Built-in rules always set this; custom rules may omit it.
 */
export type RuleCategory =
  | "structure" // void-content, unknown-tag, unused-doctor-disable
  | "key" // missing-key, duplicate-key, unstable-key
  | "theme" // raw-theme-value, raw-spacing-value
  | "typography" // inline-typography
  | "data-attr" // unknown-tone, middle-surface-anchor, unknown-density, unknown-size
  | "visual" // low-opacity
  | "output"; // layer4 html/stylelint diagnostics (auditOutput)

export interface Diagnostic {
  /** Rule id, e.g. "inline-typography". */
  rule: string;
  severity: Severity;
  /**
   * Broad structural category. Built-in rules always set this.
   * Custom rules may omit it.
   */
  category?: RuleCategory;
  /** Human path to the offending node, e.g. "div > ul > li". */
  path: string;
  message: string;
  /** How to fix it. */
  hint?: string;
}

/**
 * A custom rule that extends the doctor with project-specific checks.
 * Custom rules run alongside the built-in rules; their ids must not
 * clash with any built-in id.
 *
 * @example
 * ```ts
 * const noEmptyContent: CustomRule = {
 *   id: "no-empty-content",
 *   severity: "warning",
 *   category: "structure",
 *   check: (element, path, tag) => {
 *     if (element[tag] === "") {
 *       return [{ message: `Empty string on <${tag}> — use null or text.` }]
 *     }
 *     return []
 *   },
 * }
 *
 * diagnose(tree, { rules: [noEmptyContent] })
 * ```
 */
export interface CustomRule {
  /** Unique id shown in diagnostics. Must not clash with any built-in rule id. */
  id: string;
  /** Default severity for violations produced by this rule. */
  severity: Severity;
  /** Category for display and filtering. Optional. */
  category?: RuleCategory;
  /**
   * Called once per element node (nodes that have a valid HTML/SVG tag).
   * Return an array of violation descriptors. The engine fills in `rule`,
   * `severity`, `category`, and `path`; provide `message` and optionally
   * `hint`. Pass `severity` in the descriptor to override the rule default.
   */
  check: (
    element: Record<string, unknown>,
    path: string,
    tag: string,
  ) => Array<{ message: string; hint?: string; severity?: Severity }>;
}

export interface DiagnoseOptions {
  /**
   * Invoke reactive content functions `(listener) => …` with a no-op listener to
   * analyze their output (catches missing `_key` in dynamic lists). Default true.
   * Set false if your reactive functions have side effects.
   */
  runReactive?: boolean;
  /**
   * If set, only emit diagnostics whose rule id is in this list.
   * Takes precedence over `exclude`.
   * Applies to both built-in and custom rules.
   */
  only?: string[];
  /**
   * Rule ids to skip entirely.
   * Ignored when `only` is also set.
   * Applies to both built-in and custom rules.
   */
  exclude?: string[];
  /**
   * Additional custom rules to run alongside the built-in rules.
   * Custom rule ids are also subject to `only`/`exclude` filtering.
   */
  rules?: CustomRule[];
}

const RESERVED = new Set([
  "$",
  "style",
  "_key",
  "_portal",
  "_context",
  "_metadata",
  "_behaviors",
  "_doctorDisable", // suppress annotation — treated as metadata, not a tag candidate
]);

// Every built-in rule id, used by the unused-doctor-disable rule to recognize
// typo'd suppression entries ("low-contrst" matches no known rule → always
// stale). tests/extra.test.ts pins this exact set against the diagnostics the
// rules actually produce, so the two cannot drift apart silently.
// Exported so callers (the CLI's --only/--exclude validation, editors) can
// reject a typo'd rule id instead of silently filtering everything away.
export const BUILTIN_RULE_IDS = [
  "missing-key",
  "unstable-key",
  "duplicate-key",
  "unknown-tag",
  "void-content",
  "inline-typography",
  "raw-theme-value",
  "raw-spacing-value",
  "unknown-tone",
  "middle-surface-anchor",
  "unknown-density",
  "unknown-size",
  "low-opacity",
  "tone-background-inherit",
  "low-contrast",
  "missing-color",
  "dataTone-surface-contract",
  "color-shift-minimum",
  "invalid-nesting",
  "click-without-keyboard",
  "missing-required-attribute",
  "descendant-color-override",
  "unused-doctor-disable",
] as const;

// ─── invalid-nesting content-model tables ─────────────────────────────────────
// Static HTML content-model data, curated from Svelte's node_invalid_placement_
// ssr and html-validate. Browsers "repair" invalid nesting by re-parenting or
// discarding nodes, which breaks SSR/hydration parity — so every violation here
// is an error. The sets are kept tight on purpose: only combinations every
// browser actively repairs, so the rule stays near-zero false positives.

// Flow/block content that must not appear inside <p> (phrasing content only).
const P_FORBIDDEN_CHILDREN = new Set([
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "dl",
  "blockquote",
  "pre",
  "table",
  "form",
  "fieldset",
  "figure",
  "figcaption",
  "main",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "nav",
  "hr",
  "address",
]);

// Interactive content inside interactive content (a/button nesting).
const INTERACTIVE_NESTING: Record<string, Set<string>> = {
  a: new Set(["a", "button"]),
  button: new Set(["a", "button"]),
};

// Tags valid only under a specific parent element. `label` is the human-readable
// parent list used in diagnostics.
const REQUIRED_PARENT: Record<string, { parents: Set<string>; label: string }> =
  {
    li: { parents: new Set(["ul", "ol", "menu"]), label: "ul/ol/menu" },
    dt: { parents: new Set(["dl"]), label: "dl" },
    dd: { parents: new Set(["dl"]), label: "dl" },
    tr: {
      parents: new Set(["table", "thead", "tbody", "tfoot"]),
      label: "table/thead/tbody/tfoot",
    },
    td: { parents: new Set(["tr"]), label: "tr" },
    th: { parents: new Set(["tr"]), label: "tr" },
    option: {
      parents: new Set(["select", "optgroup", "datalist"]),
      label: "select/optgroup/datalist",
    },
    thead: { parents: new Set(["table"]), label: "table" },
    tbody: { parents: new Set(["table"]), label: "table" },
    tfoot: { parents: new Set(["table"]), label: "table" },
    caption: { parents: new Set(["table"]), label: "table" },
    colgroup: { parents: new Set(["table"]), label: "table" },
  };

// Direct element children a ul/ol may contain (everything else is re-parented).
const LIST_CHILDREN = new Set(["li", "script", "template"]);

// ─── click-without-keyboard tables ────────────────────────────────────────────
// Modeled on Svelte a11y_click_events_have_key_events + a11y_no_static_element_
// interactions.

// Natively interactive tags — an onClick on these is keyboard-reachable already.
// `dialog` counts: it is interactive content with native keyboard semantics
// (Escape fires `cancel` and closes it); an onClick on a <dialog> is the
// standard backdrop-click-to-close pattern, not a mouse-only control.
const CLICK_EXEMPT_TAGS = new Set([
  "a",
  "button",
  "dialog",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
]);

// ARIA roles that make an element interactive (keyboard operable by contract).
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tab",
  "switch",
  "checkbox",
  "radio",
  "option",
  "treeitem",
]);

// ─── low-contrast nested-block predicates ────────────────────────────────────
// Which nested style blocks (`&:hover`, `&::backdrop`, `&[disabled]`) carry a
// real text-on-surface pair. Both exclusions below are objective, not taste:
// the pair either has no contrast requirement, or no text at all.

// WCAG 2.1 SC 1.4.3 "Incidental": text that is part of an INACTIVE user
// interface component has no contrast requirement. `&:hover:not([disabled])`
// is the ENABLED state, so every `:not(…)` group is stripped before testing —
// otherwise the substring `[disabled]` inside it would exempt the very state
// the block styles.
const INACTIVE_SELECTOR =
  /\[(?:aria-)?disabled(?:\s*=\s*["']?true["']?)?\]|:disabled\b/;

function selectorTargetsInactive(selector: string): boolean {
  return INACTIVE_SELECTOR.test(selector.replace(/:not\([^)]*\)/g, ""));
}

/**
 * True when a nested style key styles OTHER elements rather than this one.
 *
 * Follows core's own join (`StyleList.getSelector`, packages/core/src/classes/
 * StyleList.ts:30): a key starting with `&` is CONCATENATED onto the element's
 * selector, anything else is joined with a space and is therefore a descendant.
 * So `&:hover`, `&::after`, `&[disabled]`, `&.active` are this element, while
 * `"& h1"`, `"& > p"`, `"& a[target]::after"`, `":hover"` and a bare `"code"`
 * reach into the subtree.
 */
/**
 * At-rules whose contents style THIS element. Core re-runs `addCSS` with the
 * SAME parent selector for `@media`/`@container`/`@supports`/`@layer`
 * (packages/core/src/classes/StyleList.ts:41), so a declaration inside one is
 * the element's own style under a condition and every rule that applies to the
 * flat block applies there too — the responsive half of a stylesheet was
 * simply unchecked before.
 *
 * `@keyframes` and `@font-face` are NOT matched here, and adding them would
 * change nothing observable: a keyframe block's own children are stops
 * (`"0%"`, `"from"`, `"to"`), never a `"& …"` selector or another conditional
 * at-rule, so `walkNestedBlocks` would skip straight past them via the same
 * general filter either way — there is no test that can tell "keyframes
 * excluded" from "keyframes included" apart, because both produce identical
 * output. What actually keeps a keyframe stop's `fontSize`/`fontWeight` (or
 * `@font-face`'s, which legitimately declares them for the font being
 * defined) from being flagged as inline typography is this structural fact,
 * not a keyframes-specific carve-out — see the "keyframe stops are never
 * flagged" test in tests/extra.test.ts for the behavior this pins instead.
 */
const CONDITIONAL_AT_RULE = /^@(?:media|container|supports|layer)\b/;

function selectorTargetsDescendants(selector: string): boolean {
  return selector.split(",").some((part) => {
    const trimmed = part.trim();
    if (!trimmed.startsWith("&")) return true;
    return /^[\s>+~]/.test(trimmed.slice(1));
  });
}

// Pseudo-elements that paint a box and never a glyph. A `color` in such a
// block (usually inherited from the base block, occasionally declared and
// unused) never reaches text, so there is no pair to measure. `::selection`,
// `::placeholder`, `::marker` and `::first-line` DO render text and stay in.
const TEXTLESS_PSEUDO =
  /::(?:backdrop|-webkit-scrollbar[\w-]*|-webkit-resizer|-webkit-slider[\w-]*|-webkit-progress[\w-]*|-moz-range[\w-]*|-moz-progress-bar)\b/;

// `::before`/`::after` render exactly what `content` puts there: an absent,
// empty or `none` content is a decorative box (a grip dot, a divider rule),
// not text.
const GENERATED_CONTENT_PSEUDO = /::(?:before|after)\b/;
const EMPTY_CONTENT = /^\s*(?:""|''|none)\s*$/;

function paintsNoText(
  selector: string,
  block: Record<string, unknown>,
): boolean {
  if (TEXTLESS_PSEUDO.test(selector)) return true;
  if (GENERATED_CONTENT_PSEUDO.test(selector)) {
    const content = block.content;
    return typeof content !== "string" || EMPTY_CONTENT.test(content);
  }
  return false;
}

// Typography style properties that must not be set inline — use patches instead.
// Expanded from bench data: fontFamily + textDecoration were missing and caused
// agents to write { style: { fontFamily: "..." } } without correction.
const TYPOGRAPHY_STYLE = new Set([
  "fontSize",
  "lineHeight",
  "fontWeight",
  "letterSpacing",
  "fontFamily",
  "textDecoration",
]);

// The fix for each property, named precisely. A patch is the right answer for
// the ones that carry a whole type step (size, decoration, the pairing of the
// two), but @domphy/theme now exports a token for the three properties a patch
// cannot express on its own — themeWeight/themeLetterSpacing/themeFont
// (packages/theme/src/typography.ts) — and each returns a var(--…) reference,
// which this rule already treats as theme-driven. Listing the valid names in
// the hint matters: an agent that is told "use themeWeight()" without them
// invents `themeWeight("500")`, which throws.
const TYPOGRAPHY_HINT: Record<string, string> = {
  fontSize:
    'Use a typography patch (paragraph()/heading()/small()/strong()/…) via $, or themeSize(l, "increase-N"|"decrease-N") for a one-off step, so the theme owns the type scale.',
  lineHeight:
    "Use a typography patch (paragraph()/heading()/small()/…) via $ — it sets the line-height that belongs to the type step. A unitless multiplier (1.5) is fine on its own and is not reported.",
  fontWeight:
    'Use themeWeight() from @domphy/theme: "light" | "regular" | "medium" | "semibold" | "bold" | "extrabold" | "black". For emphasis prefer the strong()/heading() patch, which sets the weight that belongs to the step.',
  letterSpacing:
    'Use themeLetterSpacing() from @domphy/theme: "tighter" | "tight" | "normal" | "wide" | "wider" | "widest".',
  fontFamily:
    'Remove it — the themed root already carries the sans stack and it inherits. To opt OUT of that stack (a code block, tabular figures) use themeFont("monospace"|"sans-serif") from @domphy/theme.',
  textDecoration:
    'Use the link()/small()/strong() patch that owns this text, or the cascade keywords ("none", "underline") which are not reported.',
};

// CSS cascade / non-scale values are NOT hard-coded type metrics — they
// deliberately defer to the theme or UA cascade (inherit), reset decoration
// (none), or use relative line-height multipliers. Still flag literal sizes
// ("16px"), families ("Arial"), and design weights ("600") so apps use patches.
const TYPOGRAPHY_CASCADE = new Set([
  "inherit",
  "unset",
  "initial",
  "revert",
  "revert-layer",
  "normal",
  "none",
  "underline",
  "line-through",
  "overline",
  "bold",
  "bolder",
  "lighter",
]);

/**
 * A value the THEME owns rather than the author: a `var(--…)` reference (what
 * `themeSize()` and the `--dp-font-*` hooks emit) or a `calc()`, which is
 * computed and in practice built from tokens.
 */
function isThemeDrivenValue(text: string): boolean {
  return text.includes("var(") || text.includes("calc(");
}

function isTypographyCascadeValue(prop: string, value: unknown): boolean {
  if (
    typeof value === "string" &&
    TYPOGRAPHY_CASCADE.has(value.toLowerCase())
  ) {
    return true;
  }
  // Unitless line-height multipliers (e.g. 1.5) — relative, not a type scale step.
  if (prop === "lineHeight") {
    if (typeof value === "number" && Number.isFinite(value)) return true;
    if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim()))
      return true;
  }
  return false;
}

// Color-bearing style props that should resolve through a theme token rather
// than a literal value, so theming and dark mode apply. Shorthands
// (background/border/outline) are included because they often carry a color.
const COLOR_STYLE = new Set([
  "color",
  "backgroundColor",
  "background",
  "borderColor",
  "border",
  "outlineColor",
  "outline",
  "fill",
  "stroke",
]);

// Direct (non-shorthand) color-only style properties. For these, ANY plain
// string value that is not a CSS function or semantic keyword is treated as a
// raw color — not just hex/rgb, but also named CSS colors like "red" or "white"
// that agents frequently write instead of themeColor().
const DIRECT_COLOR_PROPS = new Set([
  "color",
  "fill",
  "stroke",
  "backgroundColor",
  "outlineColor",
  "borderColor",
  "caretColor",
  "accentColor",
  "columnRuleColor",
  "textDecorationColor",
]);

// The 148 CSS Color Module Level 4 §6.1 named colors (extended color
// keywords, X11 set plus "rebeccapurple"). Used to tell a genuine named color
// ("red", "cornflowerblue") — which DOES bypass theming and must be flagged —
// from an arbitrary bare identifier that is not valid CSS at all (a typo, a
// custom ident) and is not this linter's concern. Source of truth: the spec
// table at https://www.w3.org/TR/css-color-4/#named-colors.
const CSS_NAMED_COLORS = new Set([
  "aliceblue",
  "antiquewhite",
  "aqua",
  "aquamarine",
  "azure",
  "beige",
  "bisque",
  "black",
  "blanchedalmond",
  "blue",
  "blueviolet",
  "brown",
  "burlywood",
  "cadetblue",
  "chartreuse",
  "chocolate",
  "coral",
  "cornflowerblue",
  "cornsilk",
  "crimson",
  "cyan",
  "darkblue",
  "darkcyan",
  "darkgoldenrod",
  "darkgray",
  "darkgreen",
  "darkgrey",
  "darkkhaki",
  "darkmagenta",
  "darkolivegreen",
  "darkorange",
  "darkorchid",
  "darkred",
  "darksalmon",
  "darkseagreen",
  "darkslateblue",
  "darkslategray",
  "darkslategrey",
  "darkturquoise",
  "darkviolet",
  "deeppink",
  "deepskyblue",
  "dimgray",
  "dimgrey",
  "dodgerblue",
  "firebrick",
  "floralwhite",
  "forestgreen",
  "fuchsia",
  "gainsboro",
  "ghostwhite",
  "gold",
  "goldenrod",
  "gray",
  "green",
  "greenyellow",
  "grey",
  "honeydew",
  "hotpink",
  "indianred",
  "indigo",
  "ivory",
  "khaki",
  "lavender",
  "lavenderblush",
  "lawngreen",
  "lemonchiffon",
  "lightblue",
  "lightcoral",
  "lightcyan",
  "lightgoldenrodyellow",
  "lightgray",
  "lightgreen",
  "lightgrey",
  "lightpink",
  "lightsalmon",
  "lightseagreen",
  "lightskyblue",
  "lightslategray",
  "lightslategrey",
  "lightsteelblue",
  "lightyellow",
  "lime",
  "limegreen",
  "linen",
  "magenta",
  "maroon",
  "mediumaquamarine",
  "mediumblue",
  "mediumorchid",
  "mediumpurple",
  "mediumseagreen",
  "mediumslateblue",
  "mediumspringgreen",
  "mediumturquoise",
  "mediumvioletred",
  "midnightblue",
  "mintcream",
  "mistyrose",
  "moccasin",
  "navajowhite",
  "navy",
  "oldlace",
  "olive",
  "olivedrab",
  "orange",
  "orangered",
  "orchid",
  "palegoldenrod",
  "palegreen",
  "paleturquoise",
  "palevioletred",
  "papayawhip",
  "peachpuff",
  "peru",
  "pink",
  "plum",
  "powderblue",
  "purple",
  "rebeccapurple",
  "red",
  "rosybrown",
  "royalblue",
  "saddlebrown",
  "salmon",
  "sandybrown",
  "seagreen",
  "seashell",
  "sienna",
  "silver",
  "skyblue",
  "slateblue",
  "slategray",
  "slategrey",
  "snow",
  "springgreen",
  "steelblue",
  "tan",
  "teal",
  "thistle",
  "tomato",
  "turquoise",
  "violet",
  "wheat",
  "white",
  "whitesmoke",
  "yellow",
  "yellowgreen",
]);

// CSS keyword values that carry no color meaning. These must never be flagged
// even though they appear on color properties.
const CSS_SEMANTIC_VALUES = new Set([
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "none",
  "auto",
  "revert",
  "revert-layer",
  "",
]);

// A literal color value: hex (#rgb … #rrggbbaa) or a color function that
// PRODUCES a color from raw channels — rgb()/rgba()/hsl()/hsla() plus the
// modern oklch()/oklab()/lab()/lch()/color() forms. Keywords like
// transparent/currentColor/inherit are intentionally allowed — they carry no
// theme meaning.
//
// `color-mix()` is deliberately NOT in this list: it produces no color of its
// own, it blends the colors handed to it. `color-mix(in srgb, var(--primary-9)
// 55%, var(--neutral-3))` is theme tokens being blended and resolves through
// the theme at paint time exactly like themeColor() does — flagging it as a
// raw value was wrong. A literal INSIDE a color-mix is still caught, by the
// hex and channel-function alternatives above. (`\bcolor\s*\(` cannot match
// "color-mix(" — the next character after "color" is "-", not "(".)
const LITERAL_COLOR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\s*\(/;

/**
 * Split a CSS function's argument list on top-level commas, honoring nesting.
 * `"in srgb, var(--a) 55%, color-mix(in srgb, var(--b), transparent)"` →
 * three arguments, not five.
 */
function splitTopLevelArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < args.length; index++) {
    const char = args[index];
    if (char === "(") depth++;
    else if (char === ")") depth--;
    else if (char === "," && depth === 0) {
      out.push(args.slice(start, index));
      start = index + 1;
    }
  }
  out.push(args.slice(start));
  return out;
}

/**
 * True when a value contains a `color-mix()` whose COLOR arguments are not all
 * theme tokens. The first argument is the colorspace (`in srgb`,
 * `in oklch longer hue` — css-color-5 §3), never a color, so it is skipped by
 * position rather than by keeping a list of colorspace names.
 *
 * A color term is theme-safe when it is a `var(--…)` reference, one of the
 * keywords that carry no theme meaning (`transparent`, `currentColor`, …), or
 * a nested `color-mix()` that is itself theme-safe. Anything else — a hex, a
 * channel function, or a real CSS Color 4 named color like `red` — makes the
 * whole mix raw. A bare identifier that is none of the above (a typo, a
 * custom ident) is not a color at all and is left alone — this is a theming
 * linter, not a CSS validator.
 */
function hasRawColorMix(value: string): boolean {
  const start = value.toLowerCase().indexOf("color-mix(");
  if (start === -1) return false;
  let depth = 0;
  let end = -1;
  for (let index = start + "color-mix".length; index < value.length; index++) {
    if (value[index] === "(") depth++;
    else if (value[index] === ")" && --depth === 0) {
      end = index;
      break;
    }
  }
  // Unbalanced (a truncated or generated value) — nothing decidable inside.
  if (end === -1) return false;
  const args = splitTopLevelArgs(
    value.slice(start + "color-mix(".length, end),
  ).slice(1);
  const raw = args.some((arg) => {
    // Percentages are the mix weight, not a color.
    const term = arg.replace(/-?\d+(?:\.\d+)?%/g, "").trim();
    if (term === "" || CSS_SEMANTIC_VALUES.has(term.toLowerCase()))
      return false;
    if (/^var\(/i.test(term)) return false;
    if (/^color-mix\(/i.test(term)) return hasRawColorMix(term);
    if (LITERAL_COLOR.test(term)) return true;
    return CSS_NAMED_COLORS.has(term.toLowerCase());
  });
  // Keep scanning: a value may carry several mixes (a multi-stop gradient).
  return raw || hasRawColorMix(value.slice(end + 1));
}

// Props where a literal color (hex/rgb/modern function) is flagged: the
// COLOR_STYLE shorthands plus every direct color-only prop. caretColor/
// accentColor/columnRuleColor/textDecorationColor were previously only in
// DIRECT_COLOR_PROPS (the named-color set), which requires a NON-literal
// value — so `caretColor: "#fff"` slipped through both checks.
const LITERAL_COLOR_PROPS = new Set([...COLOR_STYLE, ...DIRECT_COLOR_PROPS]);

// Spacing style properties where literal rem/em/px values should use themeSpacing().
// These are layout, not typography, but themeSpacing() ensures density consistency.
// Logical properties (paddingBlock, paddingInline, etc.) are included — they are
// used in Domphy patches and must also go through themeSpacing() for density scaling.
const SPACING_STYLE = new Set([
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "marginInline",
  "marginBlock",
  "marginInlineStart",
  "marginInlineEnd",
  "marginBlockStart",
  "marginBlockEnd",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "paddingInline",
  "paddingBlock",
  "paddingInlineStart",
  "paddingInlineEnd",
  "paddingBlockStart",
  "paddingBlockEnd",
  "gap",
  "rowGap",
  "columnGap",
  "borderRadius",
]);

// Matches one literal length token: "16px", "-8px", "1.5rem", "2em". Applied
// per whitespace-separated token so multi-value shorthands ("8px 16px") and
// negatives are caught. Unitless zero ("0") and keywords (auto/inherit) stay
// clean; function values (calc()/var()/clamp()) are computed — the whole
// value is skipped when it contains "(", so themeSpacing()/themeFluidSpacing()
// output is never flagged.
const LITERAL_SPACING_TOKEN = /^-?\d+(?:\.\d+)?(?:rem|em|px)$/;

// Returns the first literal length token in a (possibly multi-value) spacing
// string, or null when every token is a keyword, unitless, or computed value.
function findLiteralSpacingToken(value: string): string | null {
  if (value.includes("(")) return null;
  for (const token of value.trim().split(/\s+/)) {
    if (LITERAL_SPACING_TOKEN.test(token)) return token;
  }
  return null;
}

// Parses "increase-N" / "decrease-N" / "shift-N" — or a semantic alias that
// resolves to one of those — into family + numeric offset. Returns null when
// the pattern doesn't match (grammar error). The alias map is imported from
// @domphy/theme (single source of truth) — doctor previously hand-duplicated
// it, which drifted.
function parseOffset(
  value: string,
): { family: "increase" | "decrease" | "shift"; n: number } | null {
  const resolved = ToneAliases[value] ?? value;
  const m = resolved.match(/^(increase|decrease|shift)-(\d+)$/);
  if (!m) return null;
  return {
    family: m[1] as "increase" | "decrease" | "shift",
    n: parseInt(m[2], 10),
  };
}

// Valid `dataTone` grammar, kept IDENTICAL to the runtime's: offsetTone()
// (@domphy/theme) accepts exactly the strings in the exported ElementTones
// list — "inherit", "base", the semantic aliases, and shift-N/increase-N/
// decrease-N with N ≤ TONE_STEPS - 1 — and throws for everything else.
// Notably it throws for bare-numeric strings like "3": an earlier doctor
// version accepted /^-?\d+$/ ("a number" was even advertised in the rule
// hint), but the runtime rejects them — grammar contract drift. REAL number
// values (dataTone: 3) are fine and are not checked here: core's AttributeList
// preserves the JS type, so they reach offsetTone() as numbers, which it
// accepts (typeof number → returned as-is).
function isValidTone(value: string): boolean {
  return ElementTones.includes(value);
}

// ─── Chromametry integration ─────────────────────────────────────────────────

/**
 * Parses a CSS color literal (hex or rgb/rgba) into LCH [L, C, h].
 * Returns null if parsing fails or the format is unsupported (named colors, hsl).
 * Uses @domphy/theme's palette math (CIELAB via D65 reference white).
 */
function parseLiteralToLch(value: string): [number, number, number] | null {
  try {
    const trimmed = value.trim();
    let rgb: number[];

    if (trimmed.startsWith("#")) {
      let hex = trimmed;
      if (hex.length === 9) hex = hex.slice(0, 7); // strip alpha #rrggbbaa → #rrggbb
      if (hex.length === 5) hex = hex.slice(0, 4); // strip alpha #rgba → #rgb
      if (hex.length === 4) {
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
      }
      if (hex.length !== 7) return null;
      rgb = hexToRgb(hex);
    } else if (/^rgba?\s*\(/.test(trimmed)) {
      rgb = cssRgbToRgb(trimmed);
    } else {
      return null; // hsl, named colors, custom-properties — skip
    }

    const lab = rgbToLab(rgb);
    const lch = labToLch(lab);
    return [lch[0], lch[1], lch[2]];
  } catch {
    return null;
  }
}

// Pulls the first parseable color token out of a (possibly shorthand) value.
// Shorthands such as "1px solid #ccc" or "0 0 4px rgba(0,0,0,.5)" embed the
// color among other tokens, so `parseLiteralToLch` (which expects the value to
// START with the color) would otherwise miss it. Matches a #hex literal or a
// complete rgb()/rgba() call (with its arguments). hsl()/named colors are left
// for the generic fallback, matching parseLiteralToLch's own coverage.
const EMBEDDED_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\s*\([^)]*\)/;

function extractColorLiteral(value: string): string | null {
  const match = EMBEDDED_COLOR.exec(value);
  return match ? match[0] : null;
}

/**
 * Converts LCH coordinates into a concrete `themeColor()` call suggestion plus
 * a perceptual description. The tone and color-family are approximations for the
 * default Domphy theme (light, 18-step tone ramps, base near mid-lightness).
 *
 * NOTE: this perceptual-match helper conceptually belongs in @domphy/theme's
 * palette engine (it duplicates some of the chromametry stack's concerns);
 * kept here for now to avoid a cross-package refactor.
 */
function buildColorHint(lch: [number, number, number]): string {
  const [L, C, h] = lch;

  // Map lightness to a Domphy tone relative to base (~L50).
  // Each step ≈ 10 lightness units — clamp to ±9, the useful span around base
  // within the 18-step ramp (shift-0…shift-17, base tone ≈ step 7–9).
  const rawOffset = Math.round((L - 50) / 10);
  const offset = Math.max(-9, Math.min(9, rawOffset));
  let toneStr: string;
  if (Math.abs(offset) <= 1) toneStr = '"base"';
  else if (offset < 0) toneStr = `"decrease-${Math.abs(offset)}"`;
  else toneStr = `"increase-${offset}"`;

  // Infer the most likely semantic color family from chroma + hue.
  let colorFamily: string;
  if (C < 12) colorFamily = "neutral";
  else if (h < 30 || h >= 330)
    colorFamily = "error"; // red spectrum
  else if (h < 75)
    colorFamily = "warning"; // orange-yellow
  else if (h < 165)
    colorFamily = "success"; // green
  else if (h < 265)
    colorFamily = "primary"; // blue-indigo
  else colorFamily = "primary"; // violet → treat as primary

  return (
    `(l) => themeColor(l, ${toneStr}, "${colorFamily}") ` +
    `[perceptual LCH L=${Math.round(L)} C=${Math.round(C)} h=${Math.round(h)}°]`
  );
}

/**
 * Converts a literal spacing token like "16px" / "-8px" / "1.5rem" / "2em"
 * into a themeSpacing(n) suggestion. themeSpacing(n) = n/4 em, so n=4 → 1em ≈ 16px.
 */
function buildSpacingHint(prop: string, value: string): string | null {
  const token = findLiteralSpacingToken(value);
  if (!token) return null;
  const match = /^(-?\d+(?:\.\d+)?)(rem|em|px)$/.exec(token);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unit = match[2];
  let n: number;
  if (unit === "rem" || unit === "em") {
    n = Math.round(amount * 4);
  } else {
    // px: assume default 16px/rem → 1em = 16px
    n = Math.round(amount / 4);
  }
  if (n === 0) return null;
  return `${prop}: themeSpacing(${n})  — themeSpacing(n)=n/4em, so ${n}/4=${n / 4}em ≈ ${token} at default density`;
}

// ─── Style resolution helpers ─────────────────────────────────────────────────

/**
 * One standalone `ElementNode` per distinct surface tone, used ONLY as the
 * tone context a probe listener carries (see `resolveStyleValue`). It is a
 * childless `{ div: null }` — nothing recurses, no Init/Insert hook of the
 * analyzed tree runs — and `dataTone` is a small closed set (inherit/base/
 * shift-N/increase-N/decrease-N, N ≤ 17, or the semantic aliases), so this map
 * is bounded regardless of how many trees are analyzed or how large they are.
 *
 * A real node rather than a stand-in object: @domphy/theme's `contextTone()`
 * walks `listener.elementNode` up through `parent` reading the `dataTone`
 * attribute, so the only thing that resolves a tone exactly the way the
 * browser paints it is the runtime's own node type.
 *
 * Cached across analyses, not per-call: `probeStyleValue` releases every
 * subscription it picks up in a `finally`, and since core's
 * `ElementAttribute.addListener` now COMPOSES onto the caller's `onSubscribe`
 * instead of replacing it (packages/core/src/classes/ElementAttribute.ts),
 * that release handle actually arrives and actually works — a probe's
 * subscription to a cached node's `dataTone` attribute is gone again before
 * `probeStyleValue` returns. Before that core fix this map had to be cleared
 * after every `diagnose()` call (the probe's release handle never arrived, so
 * the subscription lived as long as the node did — measured 51 MB retained
 * over 40k resolutions against one cached node with forced GC); verified fixed
 * by `packages/doctor/scripts/verify-surface-retention.mjs` (0 net listeners
 * retained after 50k resolutions against 3 shared surfaces, `node
 * --expose-gc`) and by `packages/core/tests/attribute-listener-release.test.ts`,
 * which proves the same release path from core's side.
 */
const surfaceNodes = new Map<string, ElementNode>();

function surfaceNode(surface: string | number): ElementNode {
  const key = String(surface);
  let node = surfaceNodes.get(key);
  if (!node) {
    node = new ElementNode({ div: null, dataTone: surface } as never);
    surfaceNodes.set(key, node);
  }
  return node;
}

/**
 * Resolves a style property's value without building any live UI object for the
 * analyzed element: a literal string passes through; a reactive
 * `(listener) => value` function is invoked with a probe listener. Returns null
 * for non-string results, or when `runReactive` is false and the value is a
 * function.
 *
 * The probe does two things a bare `() => {}` did not:
 *
 *  - it carries a tone CONTEXT when `surface` is given. Every themeColor() tone
 *    is relative to the surrounding context (@domphy/theme `offsetTone`:
 *    `shift-N` mirrors once past the ramp midpoint, `increase-N`/`decrease-N`
 *    walk from it and clamp, and the theme's edge `darkBias` applies), so a
 *    node-less listener answers for an unshifted root and nothing else.
 *    Measured: on a `dataTone: "shift-17"` surface `shift-9` paints
 *    var(--neutral-7) and `increase-2` paints var(--neutral-17), where a
 *    node-less listener reads 9 and 2.
 *  - it RELEASES every subscription it picks up. `state.get(listener)` adds the
 *    listener to a Set the State owns (core `Notifier.addListener`), so the
 *    fresh no-op this used to pass was retained by every module-level State it
 *    ever touched, for the life of the process.
 *
 * The analyzed element itself is never constructed as an ElementNode: that
 * would recurse into every descendant and fire Init/Insert lifecycle hooks on a
 * detached subtree.
 */
function probeStyleValue(
  value: unknown,
  runReactive: boolean,
  surface: string | number | null = null,
): unknown {
  if (typeof value !== "function") return value;
  if (!runReactive) return undefined;
  const releases: Array<() => void> = [];
  const probe = (() => {}) as {
    (): void;
    elementNode?: ElementNode;
    onSubscribe?: (release: () => void) => void;
  };
  if (surface !== null) probe.elementNode = surfaceNode(surface);
  probe.onSubscribe = (release) => releases.push(release);
  try {
    return (value as (l: unknown) => unknown)(probe);
  } catch {
    return undefined; // reactive fn threw without a real runtime — skip
  } finally {
    for (const release of releases) release();
  }
}

/**
 * The string form of a style value, or null when there is none — the shape
 * most rules want (a CSS declaration they pattern-match). A reactive value is
 * resolved through {@link probeStyleValue} first.
 */
function resolveStyleValue(
  value: unknown,
  runReactive: boolean,
  surface: string | number | null = null,
): string | null {
  const resolved = probeStyleValue(value, runReactive, surface);
  return typeof resolved === "string" ? resolved : null;
}

/**
 * True when `style` declares `prop` as an own, non-nested value — mirrors
 * StyleList.addCSS's own split: a plain-object value under a style key is a
 * nested selector block (e.g. `&:hover`), not a literal/reactive style value.
 */
function hasStyleProp(style: Record<string, unknown>, prop: string): boolean {
  return prop in style && !isPlainObject(style[prop]);
}

// ─── descendant-color-override helpers ───────────────────────────────────────
// A patch styles its host through ONE generated class — specificity (0,1,0).
// An ancestor's scoped `"& small": { color: … }` is (0,1,1) and therefore wins
// on every descendant that carries such a patch, silently voiding the patch's
// color/contrast guarantee. Measured: small()'s shift-10 (6.27:1 on a shift-1
// card) dropped to 4.22:1 under an ancestor `& small { color: shift-8 }`.

/** The properties a patch can guarantee and a descendant selector can steal. */
const OVERRIDABLE_COLOR_PROPS = ["color", "backgroundColor"] as const;

/**
 * One simple selector parsed out of a `"& …"` descendant key: a bare tag
 * (`small`), a class (`.caption`), an attribute's presence (`[data-x]`), or
 * the universal selector (`*`). Compound selectors (`small.caption`,
 * `small:hover`) and value-qualified attributes (`[data-x="y"]`) are not
 * parsed — a resting-state match has to be unambiguous, and a pseudo-class
 * is deliberately excluded everywhere: it names a transient state, not the
 * resting color a patch guarantees.
 */
type DescendantSelector = {
  direct: boolean;
  kind: "tag" | "class" | "attr" | "universal";
  value: string;
  label: string;
};

/**
 * Parse a nested style key into the simple descendant selectors it targets:
 * `"& small"`, `"& > p"`, `"& .caption"`, `"& [data-x]"`, `"& > *"`,
 * `"& img, & svg"`. A pseudo-class (`"& small:hover"`) or any other
 * functional/compound form is not recognized — see {@link DescendantSelector}.
 */
function parseDescendantSelectors(selector: string): DescendantSelector[] {
  const out: DescendantSelector[] = [];
  for (const rawPart of selector.split(",")) {
    const combinatorMatch = /^\s*&\s*(>?)\s*(.*)$/.exec(rawPart);
    if (!combinatorMatch) continue;
    const direct = combinatorMatch[1] === ">";
    const rest = combinatorMatch[2];
    // `"&div"` (no combinator, no space) is a compound selector on the host
    // itself, not a descendant — require either a child combinator or real
    // whitespace before the rest of the selector.
    if (!direct && !/^\s*&\s/.test(rawPart)) continue;

    const tagMatch = /^([a-zA-Z][a-zA-Z0-9]*)\s*$/.exec(rest);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      if (TAGS.has(tag))
        out.push({ direct, kind: "tag", value: tag, label: tag });
      continue;
    }
    const classMatch = /^\.([a-zA-Z_][a-zA-Z0-9_-]*)\s*$/.exec(rest);
    if (classMatch) {
      out.push({
        direct,
        kind: "class",
        value: classMatch[1],
        label: `.${classMatch[1]}`,
      });
      continue;
    }
    const attrMatch = /^\[([a-zA-Z_][a-zA-Z0-9_-]*)\]\s*$/.exec(rest);
    if (attrMatch) {
      out.push({
        direct,
        kind: "attr",
        value: attrMatch[1],
        label: `[${attrMatch[1]}]`,
      });
      continue;
    }
    if (/^\*\s*$/.test(rest)) {
      out.push({ direct, kind: "universal", value: "", label: "*" });
    }
    // Anything else (compound selector, pseudo-class, functional selector) is
    // left unrecognized on purpose — see the DescendantSelector doc comment.
  }
  return out;
}

/** True when a declared element matches a parsed simple selector. */
function elementMatchesSelector(
  element: Record<string, unknown>,
  tag: string,
  selector: DescendantSelector,
): boolean {
  switch (selector.kind) {
    case "universal":
      return true;
    case "tag":
      return tag === selector.value;
    case "class": {
      const value = element.class ?? element.className;
      // A reactive class (`(l) => …`) is one sample of many possible
      // classlists, not the declaration — skip, matching the reactive-content
      // boundary the rest of this rule already observes.
      if (typeof value !== "string") return false;
      return value.trim().split(/\s+/).includes(selector.value);
    }
    case "attr":
      return selector.value in element;
  }
}

/**
 * The value declared for `prop` on `element` — its own native `style[prop]`
 * when present (native always wins over a patch default, same as the
 * runtime's own merge), otherwise the value the LAST patch in its `$` array
 * declares. Patches may compose (a patch returning `$: [other()]`), so nested
 * `$` arrays are followed too. Both origins generate the identical per-node
 * class at specificity (0,1,0), so both are equally outranked by a (0,1,1)
 * ancestor selector — checking patches only would miss a native declaration
 * that is just as silently overridden.
 */
function declaredStyleProp(element: unknown, prop: string): unknown {
  if (!isPlainObject(element)) return undefined;
  if (isPlainObject(element.style) && hasStyleProp(element.style, prop)) {
    return element.style[prop];
  }
  const patches = element.$;
  if (!Array.isArray(patches)) return undefined;
  let found: unknown;
  for (const patch of patches) {
    if (!isPlainObject(patch)) continue;
    const nested = declaredStyleProp(patch, prop);
    if (nested !== undefined) found = nested;
    if (isPlainObject(patch.style) && hasStyleProp(patch.style, prop)) {
      found = patch.style[prop];
    }
  }
  return found;
}

/**
 * Collect declared descendant elements matching the given selector. Reactive
 * content (`(listener) => …`) is a boundary, exactly like the other
 * declared-tree rules: what a reactive function returns is one sample, not
 * the declaration. `selector.direct` restricts the search to the host's own
 * children (`& > p`).
 */
function collectDeclaredDescendants(
  content: unknown,
  selector: DescendantSelector,
  out: Record<string, unknown>[],
  seen: Set<unknown>,
): void {
  if (Array.isArray(content)) {
    if (seen.has(content)) return;
    seen.add(content);
    for (const child of content) {
      collectDeclaredDescendants(child, selector, out, seen);
    }
    return;
  }
  if (!isPlainObject(content) || isRawHTML(content)) return;
  if (seen.has(content)) return;
  seen.add(content);
  const childTag = findTag(content);
  if (!childTag) return;
  if (elementMatchesSelector(content, childTag, selector)) out.push(content);
  // A direct-child selector stops at the host's own children; a descendant
  // selector keeps going. Either way an element that already matched still has
  // its subtree scanned for a descendant selector — `& p` matches nested <p>
  // too (invalid HTML, but the selector would still apply).
  if (selector.direct) return;
  collectDeclaredDescendants(
    content[childTag],
    { ...selector, direct: false },
    out,
    seen,
  );
}

/**
 * Extract the numeric tone step from a resolved CSS var string like `var(--neutral-9)`.
 * Returns null when the pattern doesn't match.
 */
function extractToneStep(value: string): number | null {
  const match = value.match(/var\(--[\w-]+-(\d+)\)$/);
  return match ? parseInt(match[1], 10) : null;
}

// The var(--…) shape themeColor() actually emits: `var(--<family>-<N>)` — one
// CSS var per color-family tone step (see themeVars() in @domphy/theme).
// fontSize-N vars come from themeSize(), not themeColor(), and generic custom
// properties like var(--x) are userland — neither signals a themed surface, so
// neither should count as "uses themeColor" for the missing-color rule.
const THEME_COLOR_VAR = /var\(--(?!fontSize-)[\w-]+-\d+\)/;

// ─── Suppress helper ─────────────────────────────────────────────────────────

/**
 * Applies `_doctorDisable` filtering. `elementDiags` are diagnostics produced
 * directly by this element's checks (always subject to suppression). `contentDiags`
 * are diagnostics produced by walking the element's reactive content (array-level
 * rules like missing-key fire at the element's path, so they are also suppressed
 * when they match `here`; deeper-nested diagnostics pass through unconditionally).
 *
 * Suppression scope is therefore PER-ELEMENT: the element's own diagnostics plus
 * array-level diagnostics fired at its own path — never descendants. The
 * unused-doctor-disable bookkeeping below follows that same scope: a suppression
 * entry is "used" when it actually consumed a diagnostic at this element.
 */
function applyDisable(
  disable: unknown,
  // The `_doctorDisable` the element ITSELF declares, before `$` patches are
  // merged in. Suppression uses the union (a patch author knows their patch
  // trips a rule and says so once), but staleness is only ever reported for
  // what this element declares: whether a patch's entry fires depends on the
  // patch's props, and the call site could not remove it anyway.
  ownDisable: unknown,
  elementDiags: Diagnostic[],
  contentDiags: Diagnostic[],
  here: string,
  out: Diagnostic[],
  options: DiagnoseOptions,
): void {
  if (disable === true) {
    // Suppress all diagnostics at this path (element-level + array-level).
    // Let diagnostics from deeper nodes through unconditionally.
    let suppressedAny = elementDiags.length > 0;
    for (const d of contentDiags) {
      if (d.path !== here) out.push(d);
      else suppressedAny = true;
    }
    if (!suppressedAny && ownDisable === true) {
      // `_doctorDisable: true` suppressed nothing — it can only be proven stale
      // when zero diagnostics were consumed (unlike named entries, "all rules"
      // stays meaningful as long as ANY rule fired here).
      out.push({
        rule: "unused-doctor-disable",
        severity: "info",
        category: "structure",
        path: here,
        message:
          "`_doctorDisable: true` suppresses nothing here — no diagnostic fired on this element.",
        hint: "Remove the suppression, or narrow it to the specific rule id you expect to fire.",
      });
    }
    return;
  }
  if (disable !== undefined && disable !== null && disable !== false) {
    const entries = (
      Array.isArray(disable) ? disable.map(String) : [String(disable)]
    ) as string[];
    const disabled = new Set(entries);
    const used = new Set<string>();
    for (const d of elementDiags) {
      if (disabled.has(d.rule)) used.add(d.rule);
      else out.push(d);
    }
    for (const d of contentDiags) {
      // Only suppress at THIS element's path; deeper diagnostics pass through.
      if (d.path === here && disabled.has(d.rule)) {
        used.add(d.rule);
        continue;
      }
      out.push(d);
    }
    // `ownDisable === true` cannot reach here — the union would have been true
    // and taken the branch above.
    const own = Array.isArray(ownDisable)
      ? ownDisable.map(String)
      : ownDisable === undefined || ownDisable === null || ownDisable === false
        ? []
        : [String(ownDisable)];
    reportUnusedDisable(own, disabled, used, here, out, options);
    return;
  }
  // No disable — pass everything through.
  out.push(...elementDiags);
  out.push(...contentDiags);
}

/**
 * unused-doctor-disable: reports `_doctorDisable` entries that suppressed
 * nothing on this element (modeled on ESLint v9's reportUnusedDisableDirectives).
 *
 * An entry is stale when:
 * - it names a KNOWN rule (built-in or custom via options.rules) that produced
 *   no diagnostic on this element, or
 * - it matches no known rule id at all (typo like "low-contrst" — the
 *   highest-value case: the suppression silently disables nothing).
 *
 * Usage is measured against the diagnostics the rules actually produced during
 * the walk, BEFORE the only/exclude output post-filter in diagnose(). So
 * `exclude: ["low-contrast"]` filters low-contrast out of the report but does
 * NOT turn a `_doctorDisable: "low-contrast"` that consumed a diagnostic stale
 * — exclusion narrows the output, not the analysis. (The unused-doctor-disable
 * diagnostics themselves ARE subject to only/exclude like any other rule.)
 *
 * An "unused-doctor-disable" entry on the same element suppresses this report
 * for that element (self-reference) and is itself never reported as stale.
 */
function reportUnusedDisable(
  // Only the entries the element DECLARES itself — a patch's entry is not the
  // call site's to remove (see applyDisable's `ownDisable`).
  entries: string[],
  // The full effective suppression set (element + patches), for the
  // self-suppression check: a patch may silence this rule for its hosts.
  disabled: Set<string>,
  used: Set<string>,
  here: string,
  out: Diagnostic[],
  options: DiagnoseOptions,
): void {
  if (entries.length === 0) return;
  if (disabled.has("unused-doctor-disable")) return; // self-suppressed
  const known = new Set<string>([
    ...BUILTIN_RULE_IDS,
    ...(options.rules ?? []).map((rule) => rule.id),
  ]);
  const staleKnown: string[] = [];
  const staleUnknown: string[] = [];
  for (const entry of new Set(entries)) {
    if (!known.has(entry)) staleUnknown.push(entry);
    else if (!used.has(entry)) staleKnown.push(entry);
  }
  if (staleKnown.length === 0 && staleUnknown.length === 0) return;
  const parts: string[] = [];
  if (staleKnown.length > 0) {
    parts.push(
      `suppress nothing on this element: ${staleKnown.map((id) => `"${id}"`).join(", ")}`,
    );
  }
  if (staleUnknown.length > 0) {
    parts.push(
      `match no known rule: ${staleUnknown.map((id) => `"${id}"`).join(", ")}`,
    );
  }
  out.push({
    rule: "unused-doctor-disable",
    severity: "info",
    category: "structure",
    path: here,
    message: `_doctorDisable entries ${parts.join("; ")}.`,
    hint: "Remove the stale entries (or fix the typo). Suppression scope is the element itself plus array-level diagnostics at its own path — descendants are not covered.",
  });
}

// ─── Tree walkers ─────────────────────────────────────────────────────────────

/** Statically analyzes a Domphy element tree and returns idiomatic-usage diagnostics. */
export function diagnose(
  root: unknown,
  options: DiagnoseOptions = {},
): Diagnostic[] {
  const out: Diagnostic[] = [];
  walk(root, "", out, false, options, new Set());
  // surfaceNodes is a persistent, bounded cache across calls — see its doc
  // comment for why clearing it per-call is no longer necessary.

  // Apply only/exclude post-filter (covers both built-in and custom rule ids).
  // `only` being set (even empty) activates whitelist mode: only listed rule ids pass.
  if (options.only !== undefined) {
    if (options.only.length === 0) return [];
    const only = new Set(options.only);
    return out.filter((d) => only.has(d.rule));
  }
  if (options.exclude && options.exclude.length > 0) {
    const exclude = new Set(options.exclude);
    return out.filter((d) => !exclude.has(d.rule));
  }
  return out;
}

function walk(
  node: unknown,
  path: string,
  out: Diagnostic[],
  dynamic: boolean,
  options: DiagnoseOptions,
  seen: Set<unknown>,
  // Declared immediate parent element tag (null at the root, after a reactive
  // function boundary, or when the parent is not an element). Together with
  // `inSvg` this drives the invalid-nesting content-model check.
  parentTag: string | null = null,
  inSvg = false,
  // The `dataTone` of the nearest declared ancestor surface (null at the root =
  // the theme's own edge). Reactive theme values are resolved against it, since
  // every themeColor() tone is relative to the surrounding tone context.
  surface: string | number | null = null,
): void {
  const runReactive = options.runReactive !== false;

  if (typeof node === "function") {
    if (!runReactive) return;
    // Reactive cycle guard: a function whose result — directly or through a
    // chain of functions — reaches itself again would recurse forever (the
    // object/array cycle guard below never sees it). Mark the function in
    // `seen` for the duration of its subtree walk: cycles are blocked while
    // the function is active, but the same shared function is still analyzed
    // again in each sibling branch (matching the object/array dedup policy).
    if (seen.has(node)) return;
    seen.add(node);
    let result: unknown;
    try {
      result = (node as (listener: unknown) => unknown)(() => {});
    } catch {
      seen.delete(node);
      return; // reactive fn threw without a real runtime — skip
    }
    walk(result, path, out, true, options, seen, null, false, surface);
    seen.delete(node);
    return;
  }

  // Cycle guard: a malformed tree can reference itself (element.child = element,
  // or a reactive fn returning an ancestor). Without this the walk recurses
  // forever. Shared (non-circular) references are analyzed once, which is also
  // the desired behavior — duplicates would double-report.
  if (Array.isArray(node) || isPlainObject(node)) {
    if (seen.has(node)) return;
    seen.add(node);
  }

  if (Array.isArray(node)) {
    const elementItems = node.filter(
      (child) => isPlainObject(child) && findTag(child),
    ) as Record<string, unknown>[];

    if (dynamic) {
      if (
        elementItems.length > 1 &&
        elementItems.some((item) => item._key === undefined)
      ) {
        out.push({
          rule: "missing-key",
          severity: "warning",
          category: "key",
          path: path || "(list)",
          message:
            "Dynamic list child without `_key` — reordered/keyed lists need a stable `_key` for correct reconcile.",
          hint: "Add `_key: <stable id>` to each item produced by the reactive function.",
        });
      }

      // unstable-key (heuristic): in a dynamic list every `_key` equals its
      // sibling position (0, 1, 2, …) — as a number OR its string form ("0",
      // "1", …). That is the runtime footprint of
      // `items.map((item, i) => ({ …, _key: i }))` — an array-index key, which
      // defeats the point of keying because keys shift when the list reorders.
      if (
        elementItems.length > 1 &&
        elementItems.every(
          (item, index) => item._key === index || item._key === String(index),
        )
      ) {
        out.push({
          rule: "unstable-key",
          severity: "warning",
          category: "key",
          path: path || "(list)",
          message:
            "Dynamic list `_key` values are the array index (0, 1, 2, …) — index keys are unstable across reorders/inserts.",
          hint: "Key by a stable identity from the data (e.g. `_key: item.id`), not the loop index.",
        });
      }
    }

    // duplicate-key: two siblings sharing the same `_key` value break reconcile
    const seenKeys = new Map<string, number>();
    for (const item of elementItems) {
      const key = item._key;
      if (key === undefined || key === null) continue;
      const literalKey = `${typeof key}:${String(key)}`;
      seenKeys.set(literalKey, (seenKeys.get(literalKey) ?? 0) + 1);
    }
    for (const [literalKey, count] of seenKeys) {
      if (count > 1) {
        const value = literalKey.slice(literalKey.indexOf(":") + 1);
        out.push({
          rule: "duplicate-key",
          severity: "error",
          category: "key",
          path: path || "(list)",
          message: `Duplicate \`_key\` "${value}" among ${count} siblings — keys must be unique within a list.`,
          hint: "Give each sibling a distinct stable `_key` (e.g. a record id, not a constant).",
        });
      }
    }

    node.forEach((child, index) => {
      walk(
        child,
        `${path}[${index}]`,
        out,
        false,
        options,
        seen,
        parentTag,
        inSvg,
        surface,
      );
    });
    return;
  }

  // rawHtml() content is a RawHTML class instance, not an element tree. It
  // passes isPlainObject (class instances are objects), so without this guard
  // its `__domphyRawHTML`/`html` keys were reported as unknown tags.
  if (isRawHTML(node)) return;

  if (!isPlainObject(node)) return;

  // The tag comes from the DECLARED element, exactly like core: `ElementNode`
  // reads `getTagName(domphyElement)` (and `validate()` rejects a first key
  // that is not a tag) BEFORE `mergePartial` runs, so a patch can never supply
  // the host tag.
  const tag = findTag(node);
  // Every rule below reads the EFFECTIVE props — the declared element with its
  // `$` patches applied. Without this a patch's style, dataTone, role,
  // tabIndex, keyboard handlers and `_doctorDisable` were invisible to every
  // rule: false negatives wherever a patch introduced the problem, false
  // positives wherever a patch already supplied what a rule asks for.
  // A tagless object is left declared-as-written: `unknown-tag` reports the
  // keys the author typed, not the props a patch contributed.
  const element = tag ? expandPatches(node, tag) : node;
  const here = tag ? (path ? `${path} > ${tag}` : tag) : path || "(root)";

  // The surface this element's own theme values resolve against: its own
  // `dataTone` when it declares one, otherwise the nearest declared ancestor's.
  // `contextTone()` starts the walk AT the node, so an element's own dataTone
  // applies to its own styles too. "inherit" passes the ancestor through.
  //
  // Scope limit, by design, not a gap: a `dataTone` contributed at RUNTIME
  // (a portal's `node.children.insert(...)`, an imperative `_onMount`, a
  // reactive branch) is not in this declared object graph, so there is
  // nothing here to see it with — same reactive/imperative boundary every
  // other rule in this file observes. The complementary check for that case
  // is a real browser: axe-core's `color-contrast` against the actually
  // rendered page (this repo's browser-QA lanes) measures the real computed
  // contrast regardless of where a tone came from. See
  // apps/web/docs/doctor/rules.md's low-contrast "Scope limit" section.
  const declaredTone = element.dataTone;
  const ownSurface: string | number | null =
    typeof declaredTone === "number"
      ? declaredTone
      : typeof declaredTone === "string" &&
          declaredTone !== "inherit" &&
          isValidTone(declaredTone)
        ? declaredTone
        : surface;

  // Collect element-level diagnostics in a local buffer so `_doctorDisable`
  // can filter them before they reach `out`.
  const elementDiags: Diagnostic[] = [];

  if (!tag) {
    const contentKeys = Object.keys(element).filter(
      (key) =>
        !RESERVED.has(key) &&
        !key.startsWith("_on") &&
        !key.startsWith("on") &&
        !key.startsWith("data") &&
        !key.startsWith("aria"),
    );
    // Fire per unknown key — an object with several non-tag keys is just as
    // wrong as one with a single typo'd tag, and each key needs its own fix.
    for (const key of contentKeys) {
      elementDiags.push({
        rule: "unknown-tag",
        severity: "warning",
        category: "structure",
        path: here,
        message: `"${key}" is not a known HTML/SVG tag — likely a typo.`,
        hint: key.includes("-")
          ? `An element's first key must be a valid tag, or a valid custom element name — lowercase, one hyphen after the first character ("my-widget", not "${key}").`
          : "An element's first key must be a valid tag (div, button, span, …).",
      });
    }
    applyDisable(
      element._doctorDisable,
      node._doctorDisable,
      elementDiags,
      [],
      here,
      out,
      options,
    );
    return;
  }

  const content = element[tag];

  if (VOID.has(tag) && content !== null && content !== undefined) {
    elementDiags.push({
      rule: "void-content",
      severity: "error",
      category: "structure",
      path: here,
      message: `Void tag "${tag}" must have null content (got ${Array.isArray(content) ? "array" : typeof content}).`,
      hint: `Write { ${tag}: null, … } and put attributes as sibling keys.`,
    });
  }

  // invalid-nesting: static HTML content-model check on the declared parent/child
  // pair. Browsers "repair" invalid nesting by re-parenting or discarding nodes,
  // which breaks SSR/hydration parity — so violations are errors. Only DIRECT
  // declared parent→child relationships are checked: $-patch content,
  // imperatively-inserted children, and reactive-function results are invisible
  // to the static tree and stay exempt (the walk clears parentTag across a
  // function boundary). SVG subtrees have their own content model — skipped
  // whenever the parent context or the child tag is SVG-only.
  // A custom element has no declared content model in either direction: the
  // parser never re-parents around one, so nothing here can break SSR parity.
  if (
    parentTag !== null &&
    !inSvg &&
    !SVG_ONLY.has(tag) &&
    !isCustomElementName(tag) &&
    !isCustomElementName(parentTag)
  ) {
    if (parentTag === "p" && P_FORBIDDEN_CHILDREN.has(tag)) {
      elementDiags.push({
        rule: "invalid-nesting",
        severity: "error",
        category: "structure",
        path: here,
        message: `<${tag}> is not valid inside <p> (browser will re-parent it, breaking SSR/hydration).`,
        hint: `<p> accepts phrasing content only (span, a, strong, small, …). Move the <${tag}> out of the <p>.`,
      });
    }
    if (INTERACTIVE_NESTING[parentTag]?.has(tag)) {
      elementDiags.push({
        rule: "invalid-nesting",
        severity: "error",
        category: "structure",
        path: here,
        message: `<${tag}> is not valid inside <${parentTag}> — interactive content cannot nest inside interactive content (browser will re-parent it, breaking SSR/hydration).`,
        hint: `Remove the nesting — e.g. use one interactive element and style/handle it accordingly.`,
      });
    }
    const requiredParent = REQUIRED_PARENT[tag];
    if (requiredParent && !requiredParent.parents.has(parentTag)) {
      elementDiags.push({
        rule: "invalid-nesting",
        severity: "error",
        category: "structure",
        path: here,
        message: `<${tag}> requires a ${requiredParent.label} parent (found <${parentTag}>) — browser will re-parent/discard it, breaking SSR/hydration.`,
        hint: `Wrap the <${tag}> in a ${requiredParent.label} element.`,
      });
    }
    if ((parentTag === "ul" || parentTag === "ol") && !LIST_CHILDREN.has(tag)) {
      elementDiags.push({
        rule: "invalid-nesting",
        severity: "error",
        category: "structure",
        path: here,
        message: `<${tag}> is not valid as a direct child of <${parentTag}> (only li/script/template are allowed) — browser will re-parent it, breaking SSR/hydration.`,
        hint: `Wrap the <${tag}> in an <li>, or move it out of the <${parentTag}>.`,
      });
    }
  }

  // click-without-keyboard: an onClick on a non-interactive element with no
  // keyboard handler is mouse-only — an a11y bug. Warning only. Hidden
  // elements (hidden attribute, aria-hidden, display:none) are exempt: they
  // are not reachable by pointer either.
  if (typeof element.onClick === "function" && !CLICK_EXEMPT_TAGS.has(tag)) {
    const role = typeof element.role === "string" ? element.role : undefined;
    const hasInteractiveRole =
      role !== undefined && INTERACTIVE_ROLES.has(role);
    const focusable =
      element.tabIndex !== undefined || element.tabindex !== undefined;
    const hasKeyboardHandler =
      typeof element.onKeyDown === "function" ||
      typeof element.onKeyUp === "function" ||
      typeof element.onKeyPress === "function";
    const styleForHidden = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    const displayNone =
      styleForHidden !== null &&
      resolveStyleValue(styleForHidden.display, runReactive) === "none";
    // Domphy attributes accept both the camelCase form (ariaHidden — core
    // maps it to aria-current-style kebab-case, see AttributeList) and the
    // literal DOM name ("aria-hidden").
    const ariaHidden =
      element.ariaHidden === "true" || element["aria-hidden"] === "true";
    const hiddenAway = element.hidden === true || ariaHidden || displayNone;
    if (
      !hasInteractiveRole &&
      !focusable &&
      !hasKeyboardHandler &&
      !hiddenAway
    ) {
      elementDiags.push({
        rule: "click-without-keyboard",
        severity: "warning",
        category: "structure",
        path: here,
        message: `<${tag}> has an onClick handler but no keyboard handler — mouse-only interaction is an accessibility bug.`,
        hint: `Add a keyboard handler (onKeyDown/onKeyUp/onKeyPress) plus role="button" and tabIndex: 0 — or use a natively interactive element like <button>.`,
      });
    }
  }

  // missing-required-attribute: modeled on htmlhint alt-require/title-require
  // and Svelte a11y_missing_attribute. img/iframe violations are errors; the
  // anchor-as-button case is a warning (it renders, just without keyboard or
  // screen-reader affordances).
  if (tag === "img") {
    const decorative =
      element.role === "presentation" || element.role === "none";
    // aria-label/aria-labelledby count as accessible names in both attribute
    // forms Domphy accepts: camelCase (ariaLabel — mapped by core) and the
    // literal DOM name ("aria-label").
    const hasAccessibleName =
      element.ariaLabel !== undefined ||
      element["aria-label"] !== undefined ||
      element.ariaLabelledby !== undefined ||
      element["aria-labelledby"] !== undefined;
    if (element.alt === undefined && !hasAccessibleName && !decorative) {
      elementDiags.push({
        rule: "missing-required-attribute",
        severity: "error",
        category: "structure",
        path: here,
        message: `<img> is missing an \`alt\` attribute.`,
        hint: `Add alt="…" (an empty alt="" is valid for decorative images), an aria-label/aria-labelledby, or role="presentation".`,
      });
    }
  }
  if (tag === "iframe" && element.title === undefined) {
    elementDiags.push({
      rule: "missing-required-attribute",
      severity: "error",
      category: "structure",
      path: here,
      message: `<iframe> is missing a \`title\` attribute.`,
      hint: `Add a title="…" describing the embedded content so screen readers can announce it.`,
    });
  }
  if (
    tag === "a" &&
    typeof element.onClick === "function" &&
    element.href === undefined &&
    element.role === undefined
  ) {
    elementDiags.push({
      rule: "missing-required-attribute",
      severity: "warning",
      category: "structure",
      path: here,
      message: `<a> has an onClick handler but no \`href\` and no \`role\` — a link without href is not focusable and acts like a button.`,
      hint: `Add role="button" and tabIndex: 0 (plus a keyboard handler), or use a <button>.`,
    });
  }

  // True when a `"& …"`-style selector has no declared element in `content`
  // that inline-typography could point the author at — see
  // `typographyExempt` on walkStyleProps for the reasoning. Checked per
  // comma-separated part: `"&::after, & h2"` is exempt only if EVERY part is
  // (a pseudo-element, or a tag selector matching no declared child).
  const isTypographyExemptSelector = (selector: string): boolean =>
    selector.split(",").every((rawPart) => {
      const part = rawPart.trim();
      // A pseudo-element is its own generated box — no patch can attach there
      // regardless of what children the host declares.
      if (part.includes("::")) return true;
      const targets = parseDescendantSelectors(part).filter(
        (target) => target.kind === "tag",
      );
      // A class/attribute/universal/pseudo-class selector, or anything
      // unparseable, names no single declared element doctor can point the
      // author at — the original "no call site" reasoning holds.
      if (targets.length === 0) return true;
      return !targets.some((target) => {
        const matches: Record<string, unknown>[] = [];
        collectDeclaredDescendants(content, target, matches, new Set());
        return matches.length > 0;
      });
    });

  // walkStyleProps: checks a flat style object (or pseudo-class nested style
  // like "&:hover") for theme/visual violations. Called for the element's own
  // style AND for any nested pseudo-class/pseudo-element/descendant objects
  // found inside it.
  //
  // `typographyExempt` is true for a nested block inline-typography cannot
  // act on: a pseudo-element (`"&::after"` — no patch attaches to a generated
  // box), or a block whose selector reaches into the subtree (`"& h1"`,
  // `"& > p"`) with NO matching declared child in `content`. Its whole
  // prescription is "put a typography patch on this element via `$`", and `$`
  // attaches to ONE declared element — never a pseudo-element, never a
  // subtree. When the selector DOES match a declared child (`{ div: [{ h2 }],
  // style: { "& h2": { fontSize: … } } }`), there IS a call site — the h2
  // itself — so the exemption does not apply and the hint points there.
  // Otherwise the descendant is markup this element's author does not
  // construct — a Markdown/rawHtml render, or whatever children a caller
  // hands a layout patch — so there is genuinely no call site, and a
  // descendant selector is the only implementation available. This is the
  // same shape Tailwind Typography's `prose` and VitePress's `.vp-doc` take,
  // and the one @domphy/ui's own card()/table() slot styles take. The theme
  // rules (raw-theme-value, raw-spacing-value) still run in these blocks: a
  // hard-coded hex or px is wrong no matter who it lands on.
  const walkStyleProps = (
    style: Record<string, unknown>,
    stylePath: string,
    typographyExempt = false,
  ) => {
    for (const prop in style) {
      const value = style[prop];
      // An object value is a nested block (selector or at-rule), never a style
      // value — the same split StyleList.addCSS makes. Those are walked
      // separately, by walkNestedBlocks, so their rules fire at their own path.
      if (isPlainObject(value)) continue;

      // Resolved string form of the style value: a static string passes
      // through; a reactive `(listener) => …` function is invoked with a
      // no-op listener when runReactive is on (same pattern as the theme
      // context rules). Null for non-strings and unevaluated functions.
      const resolved = resolveStyleValue(value, runReactive);

      // A reactive function is only a WRAPPER around a value, so static and
      // reactive forms are judged identically: `fontWeight: 500` and
      // `fontWeight: () => 500` are the same declaration, and a static
      // `fontFamily: "var(--dp-font-mono, ui-monospace)"` is as theme-driven as
      // the reactive one. (Previously the var()/calc() exemption lived only in
      // the reactive branch, so a static var() reference was flagged, and the
      // reactive branch only looked at STRING results, so `() => 500` escaped
      // entirely while `() => "500"` was reported.)
      if (TYPOGRAPHY_STYLE.has(prop) && !typographyExempt) {
        const reactive = typeof value === "function";
        const metric = reactive ? probeStyleValue(value, runReactive) : value;
        if (
          (typeof metric === "string" || typeof metric === "number") &&
          !isTypographyCascadeValue(prop, metric) &&
          !isThemeDrivenValue(String(metric))
        ) {
          elementDiags.push({
            rule: "inline-typography",
            severity: "warning",
            category: "typography",
            path: stylePath,
            message: reactive
              ? `Inline reactive \`${prop}\` resolves to a literal ("${metric}") — avoid inline typography styles.`
              : `Inline \`${prop}\` — avoid inline typography styles.`,
            hint: TYPOGRAPHY_HINT[prop],
          });
        }
      }

      if (
        LITERAL_COLOR_PROPS.has(prop) &&
        resolved !== null &&
        (LITERAL_COLOR.test(resolved) || hasRawColorMix(resolved))
      ) {
        const colorLiteral = extractColorLiteral(resolved) ?? resolved;
        const lch = parseLiteralToLch(colorLiteral);
        const colorHint = lch
          ? buildColorHint(lch)
          : "(l) => themeColor(l, tone, colorName)";
        elementDiags.push({
          rule: "raw-theme-value",
          severity: "info",
          category: "theme",
          path: stylePath,
          message: `Inline \`${prop}\` uses a literal color (${resolved}).`,
          hint: `Prefer a theme token — ${colorHint} — so theming and dark mode apply.`,
        });
      }

      // Named-color detection stays static-only: a reactive function's
      // resolved string is one sample of many possible values, so flagging a
      // named color from that single sample would be noisier than the
      // hex/function checks above. Membership in CSS_NAMED_COLORS (not mere
      // elimination of the other cases) keeps the message's claim — "this is
      // a CSS named color" — actually true, instead of firing on any bare
      // identifier that happens not to be a keyword, function, or var().
      if (
        DIRECT_COLOR_PROPS.has(prop) &&
        typeof value === "string" &&
        CSS_NAMED_COLORS.has(value.trim().toLowerCase())
      ) {
        elementDiags.push({
          rule: "raw-theme-value",
          severity: "info",
          category: "theme",
          path: stylePath,
          message: `Inline \`${prop}\` uses a CSS named color ("${value}").`,
          hint: `CSS named colors like "${value}" bypass theming and dark mode. Prefer (l) => themeColor(l, tone, colorName).`,
        });
      }

      if (SPACING_STYLE.has(prop) && resolved !== null) {
        const spacingHint = buildSpacingHint(prop, resolved);
        if (spacingHint) {
          elementDiags.push({
            rule: "raw-spacing-value",
            severity: "info",
            category: "theme",
            path: stylePath,
            message: `Inline \`${prop}: "${resolved}"\` uses a literal spacing value.`,
            hint: `Prefer themeSpacing() for theme density: ${spacingHint}`,
          });
        }
      }
    }
  };

  // Every nested block, at any depth: selector blocks (`&:hover`, `& h1`) and
  // conditional at-rules (`@media …`) alike. A condition keeps the element's
  // current target, a selector block may move it into the subtree — and once
  // there it stays there, so `@media { "& h1": { … } }` is as much a
  // descendant block as `"& h1"` at the top level.
  const walkNestedBlocks = (
    style: Record<string, unknown>,
    stylePath: string,
    typographyExempt: boolean,
  ) => {
    for (const prop in style) {
      const block = style[prop];
      if (!isPlainObject(block)) continue;
      const isSelector = prop.startsWith("&") || prop.startsWith(":");
      if (!isSelector && !CONDITIONAL_AT_RULE.test(prop)) continue;
      const reachesDescendants = isSelector && selectorTargetsDescendants(prop);
      // A pseudo-element concatenates onto the HOST (`selectorTargetsDescendants`
      // is false for it, same as `&:hover`) — it needs its own check, entirely
      // independent of the descendants check, or it is indistinguishable from a
      // pseudo-CLASS/attribute/class block that IS patchable.
      const purePseudoElement =
        isSelector &&
        prop.split(",").every((part) => part.trim().includes("::"));
      // Once exempt, stays exempt through deeper nesting (a "&:hover" inside
      // an exempt "& h2" is still inside that same subtree). A newly-entered
      // block earns exemption on its own selector text.
      const nestedExempt =
        typographyExempt ||
        purePseudoElement ||
        (reachesDescendants && isTypographyExemptSelector(prop));
      const nestedPath = `${stylePath}[${prop}]`;
      walkStyleProps(
        block as Record<string, unknown>,
        nestedPath,
        nestedExempt,
      );
      walkNestedBlocks(
        block as Record<string, unknown>,
        nestedPath,
        nestedExempt,
      );
    }
  };

  if (isPlainObject(element.style)) {
    const style = element.style as Record<string, unknown>;
    walkStyleProps(style, here);
    walkNestedBlocks(style, here, false);

    // descendant-color-override: a scoped `"& <tag>": { color: … }` block is
    // specificity (0,1,1); the descendant's own generated class — whether the
    // color on it came from a patch or was declared natively — is only
    // (0,1,0). So the ancestor's rule wins on every matching descendant that
    // declares that property, patch or native, silently voiding the color it
    // was given at the call site.
    //
    // Scope limit, by design: only ONE declared tree is ever analyzed here, so
    // an equal-specificity collision across TWO separately-authored trees (a
    // page shell's `"& a"` vs an unrelated flyout's own `"& a"`, only a
    // problem if they are ever actually nested together at runtime) is not
    // seen — whether they nest is an app-composition fact this tree's own
    // source does not expose, and reporting every syntactic match across a
    // codebase would be an unacceptable false-positive rate. The complementary
    // check is the same as the surface scope limit above: a real browser
    // (axe-core `color-contrast` against the actually rendered page) measures
    // whatever the real cascade produces, composition included. See
    // apps/web/docs/doctor/rules.md's descendant-color-override "Scope limit"
    // section.
    for (const prop in style) {
      const block = style[prop];
      if (!isPlainObject(block)) continue;
      const targets = parseDescendantSelectors(prop);
      if (targets.length === 0) continue;
      for (const colorProp of OVERRIDABLE_COLOR_PROPS) {
        if (!hasStyleProp(block, colorProp)) continue;
        const blockValue = resolveStyleValue(block[colorProp], runReactive);
        for (const target of targets) {
          const matches: Record<string, unknown>[] = [];
          collectDeclaredDescendants(content, target, matches, new Set());
          const patched = matches.filter((match) => {
            const declared = declaredStyleProp(match, colorProp);
            if (declared === undefined) return false;
            // An ancestor block that resolves to the SAME value the
            // descendant would paint changes nothing — a patch's own slot
            // styling (card()'s `"& > p"` repeats paragraph()'s
            // `themeColor(l, "text", …)`) is the common case. Only a value
            // the descendant did not choose voids its guarantee.
            // Unresolvable values (a reactive fn that needs a real runtime)
            // stay reported.
            const declaredValue = resolveStyleValue(declared, runReactive);
            return (
              blockValue === null ||
              declaredValue === null ||
              blockValue !== declaredValue
            );
          });
          if (patched.length === 0) continue;
          const targetLabel =
            target.kind === "tag" ? `<${target.label}>` : `"${target.label}"`;
          elementDiags.push({
            rule: "descendant-color-override",
            severity: "warning",
            category: "theme",
            path: `${here}[${prop}]`,
            message: `Scoped \`${prop}\` sets \`${colorProp}\` and outranks the declared value on ${patched.length} matching ${targetLabel} descendant${patched.length > 1 ? "s" : ""} — a descendant selector is specificity (0,1,1), the descendant's own generated class only (0,1,0), so its ${colorProp} is silently overridden.`,
            hint: `Drop \`${colorProp}\` from "${prop}" and keep only layout there. To change the ${colorProp}, pass it on the matching ${targetLabel} element itself (as a patch prop or natively), or shift the surface with \`dataTone\` so it resolves against it.`,
          });
        }
      }
    }

    // low-opacity: only checked on the MAIN style (not pseudo-classes), because
    // hover/focus states intentionally enhance or reveal — opacity inside &:hover
    // is the UX response, not the resting UX. Reactive opacity functions are
    // skipped (can't evaluate without a real runtime). Both string ("0.4") and
    // numeric (0.4) values are checked — CSS-in-JS accepts either.
    const opacityValue = style.opacity;
    let opacity: number | null = null;
    let opacityDisplay: string | null = null;
    if (typeof opacityValue === "string") {
      const parsed = parseFloat(opacityValue);
      if (!Number.isNaN(parsed)) {
        opacity = parsed;
        opacityDisplay = `"${opacityValue}"`;
      }
    } else if (
      typeof opacityValue === "number" &&
      Number.isFinite(opacityValue)
    ) {
      opacity = opacityValue;
      opacityDisplay = String(opacityValue);
    }
    // pointer-events:none elements cannot be hovered or clicked — decorative
    // by construction (e.g. an absolutely-positioned search icon dimmed to
    // 50%), so the interactive-discoverability rationale does not apply.
    // Same for disabled controls (e.g. out-of-month calendar days dimmed to
    // 0.4): intentionally inoperable, and WCAG exempts inactive controls from
    // contrast requirements.
    const pointerEventsNone =
      resolveStyleValue(style.pointerEvents, runReactive) === "none";
    const disabled = element.disabled === true;
    if (
      !pointerEventsNone &&
      !disabled &&
      opacity !== null &&
      opacity > 0 &&
      opacity < 0.6
    ) {
      const hoverStyle = style["&:hover"] as
        | Record<string, unknown>
        | undefined;
      const hoverOpacity = hoverStyle?.opacity;
      const hasFullHoverRestore = hoverOpacity === "1" || hoverOpacity === 1;
      elementDiags.push({
        rule: "low-opacity",
        severity: hasFullHoverRestore ? "info" : "warning",
        category: "visual",
        path: here,
        message: `\`style.opacity: ${opacityDisplay}\` — ${opacity < 0.5 ? "very dim" : "dim"} (${Math.round(opacity * 100)}%); interactive controls below 60% opacity are hard to see.`,
        hint: hasFullHoverRestore
          ? "Hover-reveal pattern detected (&:hover restores opacity:1). Consider raising the resting opacity to ≥ 0.6 so the control is discoverable without hovering."
          : "Use opacity ≥ 0.6 for always-visible controls and icons. For hover-reveal patterns set opacity:0 as the base and add &:hover: { opacity: '1' }.",
      });
    }
  }

  // tone-background-inherit: backgroundColor should always resolve to the current
  // surface tone via themeColor(l, "inherit"), not a fixed shifted tone.
  // Detected by running the reactive function at context=0 (no-op listener
  // has no elementNode → contextTone returns 0): if the result is a
  // var(--X-N) reference with N > 0, the function uses a non-inherit tone.
  // This catches backgroundColor: (l) => themeColor(l, "shift-N") — which
  // double-shifts when the element itself also has dataTone set, but is also
  // wrong in general: use dataTone to shift the surface, not backgroundColor.
  // Skip void/decorative hosts (`tag: null` content) — the same exemption
  // missing-color and low-contrast apply. A legend swatch or icon chip paints
  // a fixed tone BY DEFINITION and has no children for a tone context to reach:
  // `dataTone` (the fix this rule prescribes) would be meaningless there, and a
  // mid-ramp chip tone would then trip middle-surface-anchor instead.
  const bgProp =
    isPlainObject(element.style) && element[tag] !== null
      ? (element.style as Record<string, unknown>).backgroundColor
      : undefined;
  if (typeof bgProp === "function" && runReactive) {
    let bgResult: unknown;
    try {
      bgResult = (bgProp as (l: unknown) => unknown)(() => {});
    } catch {
      // reactive fn threw without a real runtime — skip
    }
    if (typeof bgResult === "string") {
      const bgMatch = bgResult.match(/var\(--[\w-]+-(\d+)\)$/);
      if (bgMatch && parseInt(bgMatch[1], 10) > 0) {
        elementDiags.push({
          rule: "tone-background-inherit",
          severity: "warning",
          category: "theme",
          path: here,
          message: `\`style.backgroundColor\` uses a fixed tone (resolves to "${bgResult}" at base context) instead of "inherit".`,
          hint: 'backgroundColor should always be (l) => themeColor(l, "inherit"). To shift the surface tone, set dataTone on the container — it applies to all children uniformly.',
        });
      }
    }
  }

  // missing-color: element uses themeColor for at least one style property
  // (detected by CSS custom-property var() in the resolved value) but does NOT
  // set `color`. Theme token usage signals an intentional visual surface — text
  // color must also be reactive so it follows the same tone context. CSS `color`
  // inheritance carries the COMPUTED value from the parent; it does not re-run
  // themeColor() when the tone context shifts, so the text can mismatch its surface.
  // Skip void/decorative hosts (`tag: null` content): they carry color tokens for
  // swatches/glyphs with no text to read (same exemption low-contrast applies) —
  // with no declared text there is nothing whose color must follow the tone.
  {
    const styleForColorCheck = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    if (styleForColorCheck) {
      const themedProps: string[] = [];
      for (const prop in styleForColorCheck) {
        if (prop === "color" || prop.startsWith("&") || prop.startsWith(":"))
          continue;
        const resolved = resolveStyleValue(
          styleForColorCheck[prop],
          runReactive,
        );
        if (resolved && THEME_COLOR_VAR.test(resolved)) themedProps.push(prop);
      }
      const contentIsNull = tag ? element[tag] === null : false;
      if (
        !contentIsNull &&
        themedProps.length > 0 &&
        !hasStyleProp(styleForColorCheck, "color")
      ) {
        elementDiags.push({
          rule: "missing-color",
          severity: "warning",
          category: "theme",
          path: here,
          message: `Element uses themeColor for \`${themedProps.join(", ")}\` but \`style.color\` is missing — text color won't re-evaluate when the tone context shifts.`,
          hint: "Add `color: (l) => themeColor(l, 'shift-9')` so text always contrasts the themed surface.",
        });
      }
    }
  }

  // Set when the FLAT color/backgroundColor pair below was reported. On a
  // `dataTone` element that honors the surface contract (`backgroundColor:
  // themeColor(l, "inherit")`) the background IS the surface, so
  // color-shift-minimum would measure the very same pair and report it a second
  // time — it defers to low-contrast there and covers only what low-contrast
  // cannot see (a background that is a gradient/image/literal, or one from a
  // different color family).
  let flatContrastReported = false;

  // low-contrast: detect insufficient contrast between `color` and `backgroundColor`
  // by comparing their shift numbers extracted from `var(--X-N)` strings — the
  // shape themeColor() returns from a reactive function, but also the literal
  // form a hand-written static value takes (resolveStyleValue passes static
  // strings through and invokes reactive functions when runReactive is on, so
  // both forms — and a mix of them — feed the same single comparison and can
  // never double-report). A shift difference < 9 violates WCAG-level legibility.
  // Skip void/decorative hosts (`tag: null` content): they carry color tokens for
  // swatches/glyphs with no text to read — series legend chips, icon rails, etc.
  {
    const styleProp = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    const contentIsNull = tag ? element[tag] === null : false;

    // Both sides are resolved against `ownSurface` — the element's own
    // `dataTone` when it declares one, otherwise the nearest declared
    // ancestor's. Every themeColor() tone is relative to that context
    // (@domphy/theme `offsetTone`: `shift-N` mirrors once past the ramp
    // midpoint, `increase-N`/`decrease-N` walk from it and clamp, plus the
    // theme's edge `darkBias`), so resolving at context 0 answered for an
    // unshifted root and nothing else. Measured on blocks' submitButton
    // (`dataTone: "shift-17"`): `shift-9` paints var(--neutral-7) and
    // `increase-2` paints var(--neutral-17) — a gap of 10, which passes —
    // where context-0 resolution read shift-9 vs shift-2 and reported 7.
    if (!contentIsNull && styleProp) {
      const colorVar = resolveStyleValue(
        styleProp.color,
        runReactive,
        ownSurface,
      );
      const bgVar = resolveStyleValue(
        styleProp.backgroundColor,
        runReactive,
        ownSurface,
      );

      // Captures both the CSS-var family (e.g. "neutral") and the numeric shift,
      // so two vars from different families (var(--error-3) vs var(--success-9))
      // are never compared — only same-family shifts are a real contrast signal.
      const extractShift = (
        v: string | null,
      ): { family: string; shift: number } | null => {
        if (v === null) return null;
        const match = v.match(/var\(--([\w-]+)-(\d+)\)$/);
        return match
          ? { family: match[1], shift: parseInt(match[2], 10) }
          : null;
      };

      const check = (
        color: string | null,
        background: string | null,
        selector: string,
        severity: Severity,
      ) => {
        const textShift = extractShift(color);
        const bgShift = extractShift(background);
        if (!textShift || !bgShift || textShift.family !== bgShift.family)
          return;
        const diff = Math.abs(textShift.shift - bgShift.shift);
        if (diff >= CONTRAST_SPAN) return;
        if (selector === "") flatContrastReported = true;
        elementDiags.push({
          rule: "low-contrast",
          severity,
          category: "theme",
          path: here,
          message: `${selector ? `\`${selector}\`: t` : "T"}ext/background ramp gap is ${diff} (step ${textShift.shift} vs step ${bgShift.shift}) — contrast may be insufficient.`,
          hint: `Aim for ≥${CONTRAST_SPAN} ramp steps between text and surface — the span at which every pair clears WCAG 4.5:1 (@domphy/theme CONTRAST_SPAN, DESIGN.md §2.1). Steps are resolved against this element's surface, so widen the gap or shift the surface with dataTone.`,
        });
      };

      check(colorVar, bgVar, "", "warning");

      // Re-measured 2026-09-24: `domphy-doctor --merge-patches` against the
      // current packages/ui/src/patches (and the whole packages/ui/src tree)
      // reports 0 low-contrast findings, nested or flat — the 14 info findings
      // across 12 patches this rule once caught were fixed in @domphy/ui after
      // this comment was written.

      // Nested selector / at-rule blocks (`&:hover`, `@media …`, `.icon`) are a
      // second set of painted states this element really renders, and they
      // CASCADE: a hover block that only swaps `backgroundColor` still paints
      // the base block's `color` on top of it. Checking the flat properties
      // alone let the most common contrast regression through — a hover
      // background that walks up toward the text tone. Any object-valued style
      // property is such a block (that is exactly how StyleList splits them),
      // and blocks nest, so inherit downward and recurse.
      //
      // Reported at `info`, not `warning`, unlike the flat pair. A nested block
      // is a transient state — hover, press, focus — and the design system
      // explicitly sanctions a ±1/±2 interactive delta there, which by
      // construction narrows the gap below CONTRAST_SPAN while the pointer is
      // down. The finding is real and worth surfacing, but the threshold cannot
      // tell a sanctioned transient state from a regression, so it must not
      // block. A patch whose own state is deliberate declares
      // `_doctorDisable: "low-contrast"` (see button()'s solid variant).
      const checkNested = (
        block: Record<string, unknown>,
        inheritedColor: string | null,
        inheritedBackground: string | null,
        selectorPath: string,
      ) => {
        for (const key in block) {
          const value = block[key];
          if (!isPlainObject(value)) continue;
          const nested = value as Record<string, unknown>;
          // Same join StyleList.getSelector uses: "&" glues, anything else
          // is a descendant.
          const selector = !selectorPath
            ? key
            : key.startsWith("&")
              ? `${selectorPath}${key.slice(1)}`
              : `${selectorPath} ${key}`;
          const color =
            resolveStyleValue(nested.color, runReactive, ownSurface) ??
            inheritedColor;
          const background =
            resolveStyleValue(
              nested.backgroundColor,
              runReactive,
              ownSurface,
            ) ?? inheritedBackground;
          if (
            !selectorTargetsInactive(selector) &&
            !paintsNoText(selector, nested)
          ) {
            check(color, background, selector, "info");
          }
          checkNested(nested, color, background, selector);
        }
      };
      checkNested(styleProp, colorVar, bgVar, "");
    }
  }

  // unknown-tone: dataTone is not valid grammar, or it's valid grammar but the
  // numeric offset is out of the 18-step ramp range (0–17).
  const dataTone = element.dataTone;
  if (typeof dataTone === "string") {
    if (!isValidTone(dataTone)) {
      elementDiags.push({
        rule: "unknown-tone",
        severity: "warning",
        category: "data-attr",
        path: here,
        message: `\`dataTone\` "${dataTone}" is not a valid tone.`,
        hint: `Use "inherit", "base", "shift-N"/"increase-N"/"decrease-N" (N ≤ ${TONE_STEPS - 1}), or a semantic alias: "surface", "hover", "border", "border-strong", "muted", "text". Bare-numeric strings like "3" are invalid — the runtime throws for them; use a real number (dataTone: 3) or "shift-3".`,
      });
    } else {
      // middle-surface-anchor: shift-4 through shift-13 sets a mid-ramp surface
      // anchor. Children's tones may clamp and fold back, collapsing the contrast
      // between background and text. Edge anchors (0–3 light, 14–17 dark) are safe.
      const parsed = parseOffset(dataTone);
      if (parsed?.family === "shift" && parsed.n >= 4 && parsed.n <= 13) {
        elementDiags.push({
          rule: "middle-surface-anchor",
          severity: "warning",
          category: "data-attr",
          path: here,
          message: `\`dataTone: "${dataTone}"\` uses a mid-ramp surface anchor (steps 4–13). Child tones derived from this surface may clamp and collapse contrast.`,
          hint: "Prefer edge anchors: shift-0–3 for light surfaces, shift-14–17 for dark. Mid anchors are only correct for intentionally inverted/highlighted regions.",
        });
      }
    }
  }

  // dataTone-surface-contract: an element that sets dataTone creates a new tone
  // context for all its children. For that surface to be self-contained it MUST
  // declare both backgroundColor (to paint the surface at the new tone) and color
  // (to set the baseline text color, guaranteeing minimum legibility without
  // relying on CSS inheritance from a different context). "inherit" is exempt —
  // it passes the parent context through without creating a new surface.
  if (
    typeof dataTone === "string" &&
    dataTone !== "inherit" &&
    isValidTone(dataTone)
  ) {
    const styleForToneCheck = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    const missingBg =
      !styleForToneCheck || !hasStyleProp(styleForToneCheck, "backgroundColor");
    const missingColor =
      !styleForToneCheck || !hasStyleProp(styleForToneCheck, "color");
    if (missingBg || missingColor) {
      const missing = [
        missingBg ? "backgroundColor" : null,
        missingColor ? "color" : null,
      ]
        .filter(Boolean)
        .join(" and ");
      elementDiags.push({
        rule: "dataTone-surface-contract",
        severity: "warning",
        category: "theme",
        path: here,
        message: `\`dataTone: "${dataTone}"\` creates a new tone surface but \`style.${missing}\` is missing — children cannot guarantee readable contrast.`,
        hint: `Surface contract: set \`backgroundColor: (l) => themeColor(l, "inherit")\`${missingColor ? ` and \`color: (l) => themeColor(l, "shift-9")\`` : ""} so the surface is fully defined at the new tone.`,
      });
    }

    // color-shift-minimum: when color IS set, verify the text clears the ramp's
    // contrast span AGAINST THIS SURFACE. The threshold is a GAP, not an
    // absolute step: `shift-N` is relative to the tone context, so on a
    // `dataTone: "shift-17"` surface `themeColor(l, "shift-9")` resolves to
    // step 7 — perfectly legible (|16 - 7| = 9) even though 7 < 9. The old
    // absolute `step < 9` test read the step at context 0 and was measuring a
    // number the browser never paints on a shifted surface.
    //
    // The surface's own index comes from @domphy/theme's `resolveToneStep`
    // (the same arithmetic the runtime uses), and the text's from resolving
    // `style.color` against that surface. Skipped when the value is not a
    // recognizable theme var, or when `runReactive` is false and color is a
    // reactive function.
    if (!missingColor && !flatContrastReported && styleForToneCheck) {
      const colorValue = resolveStyleValue(
        styleForToneCheck.color,
        runReactive,
        dataTone,
      );
      const step = colorValue !== null ? extractToneStep(colorValue) : null;
      const surfaceStep = resolveToneStep({
        surface: dataTone as ElementTone,
        tone: "inherit",
      });
      if (step !== null && Math.abs(step - surfaceStep) < CONTRAST_SPAN) {
        elementDiags.push({
          rule: "color-shift-minimum",
          severity: "warning",
          category: "theme",
          path: here,
          message: `\`style.color\` resolves to ramp step ${step} on this \`dataTone: "${dataTone}"\` surface (step ${surfaceStep}) — a gap of ${Math.abs(step - surfaceStep)}, below the ${CONTRAST_SPAN} steps body text needs.`,
          hint: `Put at least ${CONTRAST_SPAN} ramp steps between the text and its surface — that is the span at which every pair clears WCAG 4.5:1 (@domphy/theme CONTRAST_SPAN, DESIGN.md §2.1). \`themeColor(l, "text")\` does it from any surface. Decorative / secondary text may sit closer with explicit justification.`,
        });
      }
    }
  }

  // unknown-density: dataDensity value is invalid grammar or out of the 5-step
  // density range (increase/decrease 0–4; the scale factors are 0.75, 1, 1.5, 2, 2.5).
  const dataDensity = element.dataDensity;
  if (typeof dataDensity === "string" && dataDensity !== "inherit") {
    const parsed = parseOffset(dataDensity);
    if (!parsed || parsed.family === "shift") {
      elementDiags.push({
        rule: "unknown-density",
        severity: "warning",
        category: "data-attr",
        path: here,
        message: `\`dataDensity\` "${dataDensity}" is not a valid density offset.`,
        hint: 'Use "inherit", "increase-N", or "decrease-N" where N is 0–4. "shift-" is not valid for density.',
      });
    } else if (parsed.n > 4) {
      elementDiags.push({
        rule: "unknown-density",
        severity: "error",
        category: "data-attr",
        path: here,
        message: `\`dataDensity\` "${dataDensity}" N=${parsed.n} is out of range — the density scale has 5 steps (max offset: 4).`,
        hint: 'Use "increase-N" or "decrease-N" where N ≤ 4. Density factors: [0.75, 1, 1.5, 2, 2.5].',
      });
    }
  }

  // unknown-size: dataSize value is invalid grammar or out of the 8-step size
  // range (increase/decrease 0–7).
  const dataSize = element.dataSize;
  if (typeof dataSize === "string" && dataSize !== "inherit") {
    const parsed = parseOffset(dataSize);
    if (!parsed || parsed.family === "shift") {
      elementDiags.push({
        rule: "unknown-size",
        severity: "warning",
        category: "data-attr",
        path: here,
        message: `\`dataSize\` "${dataSize}" is not a valid size offset.`,
        hint: 'Use "inherit", "increase-N", or "decrease-N" where N is 0–7. "shift-" is not valid for size.',
      });
    } else if (parsed.n > 7) {
      elementDiags.push({
        rule: "unknown-size",
        severity: "error",
        category: "data-attr",
        path: here,
        message: `\`dataSize\` "${dataSize}" N=${parsed.n} is out of range — the size scale has 8 steps (max offset: 7).`,
        hint: 'Use "increase-N" or "decrease-N" where N ≤ 7.',
      });
    }
  }

  // Custom rules: run each user-provided rule against this element.
  if (options.rules && options.rules.length > 0) {
    for (const rule of options.rules) {
      let violations: ReturnType<CustomRule["check"]>;
      try {
        violations = rule.check(element, here, tag);
      } catch (error) {
        // A throwing custom rule must not silently disable itself — surface an
        // info diagnostic so the author sees their rule never ran.
        elementDiags.push({
          rule: rule.id,
          severity: "info",
          category: rule.category,
          path: here,
          message: `Custom rule "${rule.id}" threw while checking this element: ${error instanceof Error ? error.message : String(error)}`,
          hint: "Fix the custom rule's check() — its violations were not reported for this element.",
        });
        continue;
      }
      for (const v of violations) {
        elementDiags.push({
          rule: rule.id,
          severity: v.severity ?? rule.severity,
          category: rule.category,
          path: here,
          message: v.message,
          hint: v.hint,
        });
      }
    }
  }

  // Walk the element's content into a separate buffer so _doctorDisable can
  // filter array-level diagnostics (missing-key / duplicate-key / etc.) that
  // fire at THIS element's path when the content is a reactive function.
  // foreignObject re-enters HTML content inside SVG: reset both the parent
  // tag and the SVG flag so its children get normal HTML content-model checks.
  const contentDiags: Diagnostic[] = [];
  const childInSvg =
    tag === "foreignObject"
      ? false
      : inSvg || SVG_ONLY.has(tag) || tag === "svg";
  walk(
    content,
    here,
    contentDiags,
    false,
    options,
    seen,
    tag === "foreignObject" ? null : tag,
    childInSvg,
    ownSurface,
  );

  // Apply _doctorDisable and flush into the shared output.
  applyDisable(
    element._doctorDisable,
    node._doctorDisable,
    elementDiags,
    contentDiags,
    here,
    out,
    options,
  );
}

/** Issue counts by severity, plus the grand total. */
export interface ValidationSummary {
  error: number;
  warning: number;
  info: number;
  total: number;
}

/** Structured result of {@link validate}: pass/fail flag, issues, and counts. */
export interface ValidationReport {
  /** True when there are no `error`-severity diagnostics. */
  ok: boolean;
  /** Every diagnostic found, across all rules (alias of `diagnose` output). */
  issues: Diagnostic[];
  summary: ValidationSummary;
}

/**
 * Runs every diagnose rule and returns a structured report (pass/fail flag,
 * the issue list, and counts by severity). `ok` is false when any `error`
 * diagnostic is present; warnings/info do not flip `ok`. Use this as the single
 * programmatic entry point; `diagnose`/`format` remain available for raw access.
 */
export function validate(
  root: unknown,
  options: DiagnoseOptions = {},
): ValidationReport {
  const issues = diagnose(root, options);
  const summary: ValidationSummary = {
    error: 0,
    warning: 0,
    info: 0,
    total: issues.length,
  };
  for (const issue of issues) summary[issue.severity] += 1;
  return { ok: summary.error === 0, issues, summary };
}

/** Formats diagnostics as a readable report (one line per issue). */
export function format(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) return "✓ No issues found.";
  const icon = (s: Severity) =>
    s === "error" ? "✗" : s === "warning" ? "⚠" : "i";
  return diagnostics
    .map(
      (d) =>
        `${icon(d.severity)} [${d.rule}] ${d.path}\n  ${d.message}${d.hint ? `\n  → ${d.hint}` : ""}`,
    )
    .join("\n");
}
