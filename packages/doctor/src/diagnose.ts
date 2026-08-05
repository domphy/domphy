import {
  cssRgbToRgb,
  ElementTones,
  hexToRgb,
  labToLch,
  rgbToLab,
  TONE_STEPS,
  ToneAliases,
} from "@domphy/theme";
import { findTag, isPlainObject, isRawHTML, SVG_ONLY, VOID } from "./shared.js";

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
  "_doctorDisable", // suppress annotation — treated as metadata, not a tag candidate
]);

// Every built-in rule id, used by the unused-doctor-disable rule to recognize
// typo'd suppression entries ("low-contrst" matches no known rule → always
// stale). tests/extra.test.ts pins this exact set against the diagnostics the
// rules actually produce, so the two cannot drift apart silently.
const BUILTIN_RULE_IDS = [
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

// A literal color value: hex (#rgb … #rrggbbaa) or a color function —
// rgb()/rgba()/hsl()/hsla() plus the modern oklch()/oklab()/lab()/lch()/
// color()/color-mix() forms. Keywords like transparent/currentColor/inherit
// are intentionally allowed — they carry no theme meaning.
const LITERAL_COLOR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color|color-mix)\s*\(/;

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
 * Resolves a style property's value without building any live UI object: a
 * literal string passes through; a reactive `(listener) => value` function is
 * invoked with a bare no-op listener (the same pattern the tone-background-inherit
 * and low-contrast checks below already use), never by constructing a real
 * ElementNode. An earlier version built a full recursive ElementNode per element
 * just to read one resolved string — that recurses into every descendant and
 * fires Init/Insert lifecycle hooks on a detached subtree, and leaks a State
 * listener per reactive prop per element visited. Returns null for non-string
 * results, or when `runReactive` is false and the value is a function.
 */
function resolveStyleValue(
  value: unknown,
  runReactive: boolean,
): string | null {
  if (typeof value === "string") return value;
  if (typeof value !== "function" || !runReactive) return null;
  try {
    const result = (value as (l: unknown) => unknown)(() => {});
    return typeof result === "string" ? result : null;
  } catch {
    return null; // reactive fn threw without a real runtime — skip
  }
}

/**
 * True when `style` declares `prop` as an own, non-nested value — mirrors
 * StyleList.addCSS's own split: a plain-object value under a style key is a
 * nested selector block (e.g. `&:hover`), not a literal/reactive style value.
 */
function hasStyleProp(style: Record<string, unknown>, prop: string): boolean {
  return prop in style && !isPlainObject(style[prop]);
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
    if (!suppressedAny) {
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
    reportUnusedDisable(entries, used, here, out, options);
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
  entries: string[],
  used: Set<string>,
  here: string,
  out: Diagnostic[],
  options: DiagnoseOptions,
): void {
  if (entries.includes("unused-doctor-disable")) return; // self-suppressed
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
    walk(result, path, out, true, options, seen);
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
      );
    });
    return;
  }

  // rawHtml() content is a RawHTML class instance, not an element tree. It
  // passes isPlainObject (class instances are objects), so without this guard
  // its `__domphyRawHTML`/`html` keys were reported as unknown tags.
  if (isRawHTML(node)) return;

  if (!isPlainObject(node)) return;

  const element = node;
  const tag = findTag(element);
  const here = tag ? (path ? `${path} > ${tag}` : tag) : path || "(root)";

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
        hint: "An element's first key must be a valid tag (div, button, span, …).",
      });
    }
    applyDisable(element._doctorDisable, elementDiags, [], here, out, options);
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
  if (parentTag !== null && !inSvg && !SVG_ONLY.has(tag)) {
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

  // walkStyleProps: checks a flat style object (or pseudo-class nested style
  // like "&:hover") for theme/visual violations. Called for the element's own
  // style AND for any nested pseudo-class objects found inside it.
  const walkStyleProps = (
    style: Record<string, unknown>,
    stylePath: string,
  ) => {
    for (const prop in style) {
      // Skip nested pseudo-class objects at this level — they are walked
      // separately after the outer loop so their rules fire at the right path.
      if (prop.startsWith("&") || prop.startsWith(":")) continue;
      const value = style[prop];

      // Resolved string form of the style value: a static string passes
      // through; a reactive `(listener) => …` function is invoked with a
      // no-op listener when runReactive is on (same pattern as the theme
      // context rules). Null for non-strings and unevaluated functions.
      const resolved = resolveStyleValue(value, runReactive);

      if (TYPOGRAPHY_STYLE.has(prop)) {
        if (typeof value === "function") {
          // Reactive typography: flag literal metrics resolved from the
          // function, but never theme-driven results — themeSize() returns a
          // var(--fontSize-N) reference and calc() values are computed, both
          // of which are the prescribed pattern.
          if (
            resolved !== null &&
            !resolved.includes("var(") &&
            !resolved.includes("calc(") &&
            !isTypographyCascadeValue(prop, resolved)
          ) {
            elementDiags.push({
              rule: "inline-typography",
              severity: "warning",
              category: "typography",
              path: stylePath,
              message: `Inline reactive \`${prop}\` resolves to a literal ("${resolved}") — avoid inline typography styles.`,
              hint: "Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.",
            });
          }
        } else if (!isTypographyCascadeValue(prop, value)) {
          elementDiags.push({
            rule: "inline-typography",
            severity: "warning",
            category: "typography",
            path: stylePath,
            message: `Inline \`${prop}\` — avoid inline typography styles.`,
            hint: "Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.",
          });
        }
      }

      if (
        LITERAL_COLOR_PROPS.has(prop) &&
        resolved !== null &&
        LITERAL_COLOR.test(resolved)
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
      // hex/function checks above.
      if (
        DIRECT_COLOR_PROPS.has(prop) &&
        typeof value === "string" &&
        !LITERAL_COLOR.test(value) &&
        !value.includes("(") &&
        !value.startsWith("--") &&
        !CSS_SEMANTIC_VALUES.has(value.trim().toLowerCase())
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

  if (isPlainObject(element.style)) {
    const style = element.style as Record<string, unknown>;
    walkStyleProps(style, here);
    // Walk pseudo-class nested objects (&:hover, &:focus, &:active, etc.)
    for (const prop in style) {
      if (
        (prop.startsWith("&") || prop.startsWith(":")) &&
        isPlainObject(style[prop])
      ) {
        walkStyleProps(
          style[prop] as Record<string, unknown>,
          `${here}[${prop}]`,
        );
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
  const bgProp = isPlainObject(element.style)
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

    if (!contentIsNull && styleProp) {
      const colorVar = resolveStyleValue(styleProp.color, runReactive);
      const bgVar = resolveStyleValue(styleProp.backgroundColor, runReactive);

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

      const textShift = extractShift(colorVar);
      const bgShift = extractShift(bgVar);

      if (textShift && bgShift && textShift.family === bgShift.family) {
        const diff = Math.abs(textShift.shift - bgShift.shift);
        if (diff < 9) {
          elementDiags.push({
            rule: "low-contrast",
            severity: "warning",
            category: "theme",
            path: here,
            message: `Text/background shift gap is ${diff} (shift-${textShift.shift} vs shift-${bgShift.shift}) — contrast may be insufficient.`,
            hint: `Aim for ≥9 shift steps between text and surface. E.g. shift-0 bg + shift-9 text, or shift-11 text on a shift-0 surface. Increase the gap or rely on a parent dataTone to open it.`,
          });
        }
      }
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

    // color-shift-minimum: when color IS set, verify its resolved tone step is ≥ 9
    // (minimum legibility against any standard surface). Extracted from the CSS var
    // that themeColor() emits; skipped if the value isn't a recognizable theme var,
    // or if `runReactive` is false and color is a reactive function.
    if (!missingColor && styleForToneCheck) {
      const colorValue = resolveStyleValue(
        styleForToneCheck.color,
        runReactive,
      );
      const step = colorValue !== null ? extractToneStep(colorValue) : null;
      if (step !== null && step < 9) {
        elementDiags.push({
          rule: "color-shift-minimum",
          severity: "warning",
          category: "theme",
          path: here,
          message: `\`style.color\` resolves to tone step ${step} — below the minimum shift-9 required for legible text on a standard surface.`,
          hint: 'Use at least `themeColor(l, "shift-9")` for body text. Decorative / secondary text may use shift-7 or shift-8 with explicit justification.',
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
  );

  // Apply _doctorDisable and flush into the shared output.
  applyDisable(
    element._doctorDisable,
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
