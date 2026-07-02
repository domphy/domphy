import { cssRgbToRgb, hexToRgb, labToLch, rgbToLab } from "@domphy/palette";
import { findTag, isPlainObject, VOID } from "./shared.js";

export type Severity = "error" | "warning" | "info";

/**
 * Broad structural category for a rule. Mirrors Biome's lint category model.
 * Built-in rules always set this; custom rules may omit it.
 */
export type RuleCategory =
  | "structure" // void-content, unknown-tag
  | "key" // missing-key, duplicate-key, unstable-key
  | "theme" // raw-theme-value, raw-spacing-value
  | "typography" // inline-typography
  | "data-attr" // unknown-tone, middle-surface-anchor, unknown-density, unknown-size
  | "visual"; // low-opacity

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

// A literal color value: hex (#rgb … #rrggbbaa) or an rgb()/rgba()/hsl()/hsla()
// function. Keywords like transparent/currentColor/inherit are intentionally
// allowed — they carry no theme meaning.
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/;

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
]);

// Matches literal spacing values like "16px", "1.5rem", "2em" but not "auto",
// "inherit", "0" (unitless zero is fine), or computed values.
const LITERAL_SPACING = /^(\d+(?:\.\d+)?)(rem|em|px)$/;

// Parses "increase-N" / "decrease-N" / "shift-N" into family + numeric offset.
// Returns null when the pattern doesn't match (grammar error).
function parseOffset(
  value: string,
): { family: "increase" | "decrease" | "shift"; n: number } | null {
  const m = value.match(/^(increase|decrease|shift)-(\d+)$/);
  if (!m) return null;
  return {
    family: m[1] as "increase" | "decrease" | "shift",
    n: parseInt(m[2], 10),
  };
}

// Valid `dataTone` grammar AND range:
//   "inherit", "base", a bare integer, or shift-N/increase-N/decrease-N where N ≤ 17.
//   The default Domphy theme has 18 tone steps (0–17). Values with valid grammar
//   but N > 17 are also rejected here so they surface as `unknown-tone` errors.
function isValidTone(value: string): boolean {
  if (value === "inherit" || value === "base") return true;
  if (/^-?\d+$/.test(value)) return true;
  const parsed = parseOffset(value);
  if (!parsed) return false;
  return parsed.n <= 17; // tone ramp has 18 steps: 0–17
}

// ─── Chromametry integration ─────────────────────────────────────────────────

/**
 * Parses a CSS color literal (hex or rgb/rgba) into LCH [L, C, h].
 * Returns null if parsing fails or the format is unsupported (named colors, hsl).
 * Uses @domphy/palette math (CIELAB via D65 reference white).
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
 * default Domphy theme (light, 10 neutral tones, base at mid-lightness).
 */
function buildColorHint(lch: [number, number, number]): string {
  const [L, C, h] = lch;

  // Map lightness to a Domphy tone relative to base (~L50).
  // Each step ≈ 10 lightness units — clamp to ±9 (max offset in a 10-step ramp).
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
 * Converts a literal spacing value like "16px" / "1.5rem" / "2em" into a
 * themeSpacing(n) suggestion. themeSpacing(n) = n/4 em, so n=4 → 1em ≈ 16px.
 */
function buildSpacingHint(prop: string, value: string): string | null {
  const match = LITERAL_SPACING.exec(value);
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
  if (n <= 0) return null;
  return `${prop}: themeSpacing(${n})  — themeSpacing(n)=n/4em, so ${n}/4=${n / 4}em ≈ ${value} at default density`;
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
function resolveStyleValue(value: unknown, runReactive: boolean): string | null {
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

// ─── Suppress helper ─────────────────────────────────────────────────────────

/**
 * Applies `_doctorDisable` filtering. `elementDiags` are diagnostics produced
 * directly by this element's checks (always subject to suppression). `contentDiags`
 * are diagnostics produced by walking the element's reactive content (array-level
 * rules like missing-key fire at the element's path, so they are also suppressed
 * when they match `here`; deeper-nested diagnostics pass through unconditionally).
 */
function applyDisable(
  disable: unknown,
  elementDiags: Diagnostic[],
  contentDiags: Diagnostic[],
  here: string,
  out: Diagnostic[],
): void {
  if (disable === true) {
    // Suppress all diagnostics at this path (element-level + array-level).
    // Let diagnostics from deeper nodes through unconditionally.
    for (const d of contentDiags) {
      if (d.path !== here) out.push(d);
    }
    return;
  }
  if (disable !== undefined && disable !== null && disable !== false) {
    const disabled = new Set(
      Array.isArray(disable) ? (disable as string[]) : [String(disable)],
    );
    for (const d of elementDiags) {
      if (!disabled.has(d.rule)) out.push(d);
    }
    for (const d of contentDiags) {
      // Only suppress at THIS element's path; deeper diagnostics pass through.
      if (d.path === here && disabled.has(d.rule)) continue;
      out.push(d);
    }
    return;
  }
  // No disable — pass everything through.
  out.push(...elementDiags);
  out.push(...contentDiags);
}

// ─── Tree walkers ─────────────────────────────────────────────────────────────

/** Statically analyzes a Domphy element tree and returns idiomatic-usage diagnostics. */
export function diagnose(
  root: unknown,
  options: DiagnoseOptions = {},
): Diagnostic[] {
  const out: Diagnostic[] = [];
  walk(root, "", out, false, options);

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
): void {
  const runReactive = options.runReactive !== false;

  if (typeof node === "function") {
    if (!runReactive) return;
    let result: unknown;
    try {
      result = (node as (listener: unknown) => unknown)(() => {});
    } catch {
      return; // reactive fn threw without a real runtime — skip
    }
    walk(result, path, out, true, options);
    return;
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
      // sibling position (0, 1, 2, …). That is the runtime footprint of
      // `items.map((item, i) => ({ …, _key: i }))` — an array-index key, which
      // defeats the point of keying because keys shift when the list reorders.
      if (
        elementItems.length > 1 &&
        elementItems.every((item, index) => item._key === index)
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
      walk(child, `${path}[${index}]`, out, false, options);
    });
    return;
  }

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
    if (contentKeys.length === 1) {
      elementDiags.push({
        rule: "unknown-tag",
        severity: "warning",
        category: "structure",
        path: here,
        message: `"${contentKeys[0]}" is not a known HTML/SVG tag — likely a typo.`,
        hint: "An element's first key must be a valid tag (div, button, span, …).",
      });
    }
    applyDisable(element._doctorDisable, elementDiags, [], here, out);
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

  // walkStyleProps: checks a flat style object (or pseudo-class nested style
  // like "&:hover") for theme/visual violations. Called for the element's own
  // style AND for any nested pseudo-class objects found inside it.
  const walkStyleProps = (style: Record<string, unknown>, stylePath: string) => {
    for (const prop in style) {
      // Skip nested pseudo-class objects at this level — they are walked
      // separately after the outer loop so their rules fire at the right path.
      if (prop.startsWith("&") || prop.startsWith(":")) continue;
      const value = style[prop];

      if (TYPOGRAPHY_STYLE.has(prop) && typeof value !== "function") {
        elementDiags.push({
          rule: "inline-typography",
          severity: "warning",
          category: "typography",
          path: stylePath,
          message: `Inline \`${prop}\` — avoid inline typography styles.`,
          hint: "Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.",
        });
      }

      if (COLOR_STYLE.has(prop) && typeof value === "string" && LITERAL_COLOR.test(value)) {
        const colorLiteral = extractColorLiteral(value) ?? value;
        const lch = parseLiteralToLch(colorLiteral);
        const colorHint = lch ? buildColorHint(lch) : "(l) => themeColor(l, tone, colorName)";
        elementDiags.push({
          rule: "raw-theme-value",
          severity: "info",
          category: "theme",
          path: stylePath,
          message: `Inline \`${prop}\` uses a literal color (${value}).`,
          hint: `Prefer a theme token — ${colorHint} — so theming and dark mode apply.`,
        });
      }

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

      if (SPACING_STYLE.has(prop) && typeof value === "string") {
        const spacingHint = buildSpacingHint(prop, value);
        if (spacingHint) {
          elementDiags.push({
            rule: "raw-spacing-value",
            severity: "info",
            category: "theme",
            path: stylePath,
            message: `Inline \`${prop}: "${value}"\` uses a literal spacing value.`,
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
      if ((prop.startsWith("&") || prop.startsWith(":")) && isPlainObject(style[prop])) {
        walkStyleProps(style[prop] as Record<string, unknown>, `${here}[${prop}]`);
      }
    }

    // low-opacity: only checked on the MAIN style (not pseudo-classes), because
    // hover/focus states intentionally enhance or reveal — opacity inside &:hover
    // is the UX response, not the resting UX. Reactive opacity functions are
    // skipped (can't evaluate without a real runtime).
    const opacityValue = style.opacity;
    if (typeof opacityValue === "string") {
      const opacity = parseFloat(opacityValue);
      if (!Number.isNaN(opacity) && opacity > 0 && opacity < 0.6) {
        const hoverStyle = style["&:hover"] as Record<string, unknown> | undefined;
        const hoverOpacity = hoverStyle?.opacity;
        const hasFullHoverRestore = hoverOpacity === "1" || hoverOpacity === 1;
        elementDiags.push({
          rule: "low-opacity",
          severity: hasFullHoverRestore ? "info" : "warning",
          category: "visual",
          path: here,
          message: `\`style.opacity: "${opacityValue}"\` — ${opacity < 0.5 ? "very dim" : "dim"} (${Math.round(opacity * 100)}%); interactive controls below 60% opacity are hard to see.`,
          hint: hasFullHoverRestore
            ? "Hover-reveal pattern detected (&:hover restores opacity:1). Consider raising the resting opacity to ≥ 0.6 so the control is discoverable without hovering."
            : "Use opacity ≥ 0.6 for always-visible controls and icons. For hover-reveal patterns set opacity:0 as the base and add &:hover: { opacity: '1' }.",
        });
      }
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
  {
    const styleForColorCheck = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    if (styleForColorCheck) {
      const themedProps: string[] = [];
      for (const prop in styleForColorCheck) {
        if (prop === "color" || prop.startsWith("&") || prop.startsWith(":")) continue;
        const resolved = resolveStyleValue(styleForColorCheck[prop], runReactive);
        if (resolved && resolved.includes("var(")) themedProps.push(prop);
      }
      if (themedProps.length > 0 && !hasStyleProp(styleForColorCheck, "color")) {
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
  // by comparing their shift numbers extracted from the `var(--X-N)` strings that
  // themeColor() returns. Both props must be reactive and resolve to theme vars for
  // this check to fire. A shift difference < 9 violates WCAG-level legibility.
  {
    const styleProp = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    const colorFn = styleProp?.color;
    const bgFn = styleProp?.backgroundColor;

    if (runReactive && typeof colorFn === "function" && typeof bgFn === "function") {
      let colorVar: unknown;
      let bgVar: unknown;
      try {
        colorVar = (colorFn as (l: unknown) => unknown)(() => {});
        bgVar = (bgFn as (l: unknown) => unknown)(() => {});
      } catch { /* reactive fn threw without a runtime — skip */ }

      // Captures both the CSS-var family (e.g. "neutral") and the numeric shift,
      // so two vars from different families (var(--error-3) vs var(--success-9))
      // are never compared — only same-family shifts are a real contrast signal.
      const extractShift = (v: unknown): { family: string; shift: number } | null => {
        if (typeof v !== "string") return null;
        const match = v.match(/var\(--([\w-]+)-(\d+)\)$/);
        return match ? { family: match[1], shift: parseInt(match[2], 10) } : null;
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
        hint: 'Use "inherit", "base", a number, or "shift-N"/"increase-N"/"decrease-N" with N ≤ 17 (the ramp has 18 steps). Words like "surface"/"text" are not tones.',
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
  if (typeof dataTone === "string" && dataTone !== "inherit" && isValidTone(dataTone)) {
    const styleForToneCheck = isPlainObject(element.style)
      ? (element.style as Record<string, unknown>)
      : null;
    const missingBg = !styleForToneCheck || !hasStyleProp(styleForToneCheck, "backgroundColor");
    const missingColor = !styleForToneCheck || !hasStyleProp(styleForToneCheck, "color");
    if (missingBg || missingColor) {
      const missing = [
        missingBg ? "backgroundColor" : null,
        missingColor ? "color" : null,
      ].filter(Boolean).join(" and ");
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
      const colorValue = resolveStyleValue(styleForToneCheck.color, runReactive);
      const step = colorValue !== null ? extractToneStep(colorValue) : null;
      if (step !== null && step < 9) {
        elementDiags.push({
          rule: "color-shift-minimum",
          severity: "warning",
          category: "theme",
          path: here,
          message: `\`style.color\` resolves to tone step ${step} — below the minimum shift-9 required for legible text on a standard surface.`,
          hint: "Use at least `themeColor(l, \"shift-9\")` for body text. Decorative / secondary text may use shift-7 or shift-8 with explicit justification.",
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
      } catch {
        continue; // custom rule threw — skip silently
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
  const contentDiags: Diagnostic[] = [];
  walk(content, here, contentDiags, false, options);

  // Apply _doctorDisable and flush into the shared output.
  applyDisable(element._doctorDisable, elementDiags, contentDiags, here, out);
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
