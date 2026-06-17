import { HtmlTags, SvgTags, VoidTags } from "@domphy/core";
import {
  hexToRgb,
  rgbToLab,
  labToLch,
  cssRgbToRgb,
} from "@domphy/palette";

export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  /** Rule id, e.g. "inline-typography". */
  rule: string;
  severity: Severity;
  /** Human path to the offending node, e.g. "div > ul > li". */
  path: string;
  message: string;
  /** How to fix it. */
  hint?: string;
}

export interface DiagnoseOptions {
  /**
   * Invoke reactive content functions `(listener) => …` with a no-op listener to
   * analyze their output (catches missing `_key` in dynamic lists). Default true.
   * Set false if your reactive functions have side effects.
   */
  runReactive?: boolean;
}

const TAGS = new Set<string>([...HtmlTags, ...SvgTags]);
const VOID = new Set<string>(VoidTags);
const RESERVED = new Set([
  "$",
  "style",
  "_key",
  "_portal",
  "_context",
  "_metadata",
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

// A literal color value: hex (#rgb … #rrggbbaa) or an rgb()/rgba()/hsl()/hsla()
// function. Keywords like transparent/currentColor/inherit are intentionally
// allowed — they carry no theme meaning.
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/;

// Spacing style properties where literal rem/em/px values should use themeSpacing().
// These are layout, not typography, but themeSpacing() ensures density consistency.
const SPACING_STYLE = new Set([
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "gap",
  "rowGap",
  "columnGap",
]);

// Matches literal spacing values like "16px", "1.5rem", "2em" but not "auto",
// "inherit", "0" (unitless zero is fine), or computed values.
const LITERAL_SPACING = /^(\d+(?:\.\d+)?)(rem|em|px)$/;

// Valid `dataTone` grammar: "inherit", "base", an integer, or one of the offset
// families increase-/decrease-/shift- followed by an integer. The exact upper
// bound is theme-specific (default 10 tones), so only the grammar is checked —
// enough to catch tone WORDS like "surface"/"text"/"muted" that LLMs invent.
const TONE_PATTERN = /^(?:increase|decrease|shift)-\d+$/;
function isValidTone(value: string): boolean {
  if (value === "inherit" || value === "base") return true;
  if (/^-?\d+$/.test(value)) return true;
  return TONE_PATTERN.test(value);
}

// ─── Chromametry integration ─────────────────────────────────────────────────

/**
 * Parses a CSS color literal (hex or rgb/rgba) into LCH [L, C, h].
 * Returns null if parsing fails or the format is unsupported (named colors, hsl).
 * Uses @domphy/palette math (CIELAB via D65 reference white).
 */
function parseLiteralToLch(
  value: string,
): [number, number, number] | null {
  try {
    const trimmed = value.trim();
    let rgb: number[];

    if (trimmed.startsWith("#")) {
      let hex = trimmed;
      if (hex.length === 9) hex = hex.slice(0, 7); // strip alpha #rrggbbaa → #rrggbb
      if (hex.length === 5) hex = hex.slice(0, 4); // strip alpha #rgba → #rgb
      if (hex.length === 4) {
        hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
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
  else if (h < 30 || h >= 330) colorFamily = "error";   // red spectrum
  else if (h < 75) colorFamily = "warning";             // orange-yellow
  else if (h < 165) colorFamily = "success";            // green
  else if (h < 265) colorFamily = "primary";            // blue-indigo
  else colorFamily = "primary";                         // violet → treat as primary

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

// ─── Tree walkers ─────────────────────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findTag(element: Record<string, unknown>): string | undefined {
  for (const key in element) {
    if (TAGS.has(key)) return key;
  }
  return undefined;
}

/** Statically analyzes a Domphy element tree and returns idiomatic-usage diagnostics. */
export function diagnose(
  root: unknown,
  options: DiagnoseOptions = {},
): Diagnostic[] {
  const out: Diagnostic[] = [];
  walk(root, "", out, false, options.runReactive !== false);
  return out;
}

function walk(
  node: unknown,
  path: string,
  out: Diagnostic[],
  dynamic: boolean,
  runReactive: boolean,
): void {
  if (typeof node === "function") {
    if (!runReactive) return;
    let result: unknown;
    try {
      result = (node as (listener: unknown) => unknown)(() => {});
    } catch {
      return; // reactive fn threw without a real runtime — skip
    }
    walk(result, path, out, true, runReactive);
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
          path: path || "(list)",
          message: `Duplicate \`_key\` "${value}" among ${count} siblings — keys must be unique within a list.`,
          hint: "Give each sibling a distinct stable `_key` (e.g. a record id, not a constant).",
        });
      }
    }

    node.forEach((child, index) => {
      walk(child, `${path}[${index}]`, out, false, runReactive);
    });
    return;
  }

  if (!isPlainObject(node)) return;

  const element = node;
  const tag = findTag(element);
  const here = tag ? (path ? `${path} > ${tag}` : tag) : path || "(root)";

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
      out.push({
        rule: "unknown-tag",
        severity: "warning",
        path: here,
        message: `"${contentKeys[0]}" is not a known HTML/SVG tag — likely a typo.`,
        hint: "An element's first key must be a valid tag (div, button, span, …).",
      });
    }
    return;
  }

  const content = element[tag];

  if (VOID.has(tag) && content !== null && content !== undefined) {
    out.push({
      rule: "void-content",
      severity: "error",
      path: here,
      message: `Void tag "${tag}" must have null content (got ${Array.isArray(content) ? "array" : typeof content}).`,
      hint: `Write { ${tag}: null, … } and put attributes as sibling keys.`,
    });
  }

  if (isPlainObject(element.style)) {
    const style = element.style;
    for (const prop in style) {
      const value = style[prop];

      // inline-typography: typography properties must come from patches, not
      // inline style. fontFamily and textDecoration were missing from the original
      // set and are added here based on bench data showing persistent violations.
      if (TYPOGRAPHY_STYLE.has(prop) && typeof value !== "function") {
        out.push({
          rule: "inline-typography",
          severity: "warning",
          path: here,
          message: `Inline \`${prop}\` — avoid inline typography styles.`,
          hint: "Use a typography patch (paragraph()/heading()/small()/strong()/…) via $ so the theme owns the type scale.",
        });
      }

      // raw-theme-value: literal color values bypass theming/dark mode.
      // Enhanced with @domphy/palette chromametry: converts the literal color to
      // LCH and suggests the nearest themeColor() call with perceptual coordinates.
      if (
        COLOR_STYLE.has(prop) &&
        typeof value === "string" &&
        LITERAL_COLOR.test(value)
      ) {
        const lch = parseLiteralToLch(value);
        const colorHint = lch
          ? buildColorHint(lch)
          : "(l) => themeColor(l, tone, colorName)";

        out.push({
          rule: "raw-theme-value",
          severity: "info",
          path: here,
          message: `Inline \`${prop}\` uses a literal color (${value}).`,
          hint: `Prefer a theme token — ${colorHint} — so theming and dark mode apply.`,
        });
      }

      // raw-spacing-value: literal rem/em/px spacing values should use themeSpacing()
      // to respect the theme's density system. info-severity (soft recommendation).
      if (SPACING_STYLE.has(prop) && typeof value === "string") {
        const spacingHint = buildSpacingHint(prop, value);
        if (spacingHint) {
          out.push({
            rule: "raw-spacing-value",
            severity: "info",
            path: here,
            message: `Inline \`${prop}: "${value}"\` uses a literal spacing value.`,
            hint: `Prefer themeSpacing() for theme density: ${spacingHint}`,
          });
        }
      }
    }
  }

  // unknown-tone: a `dataTone` attribute whose value is a string that is not a
  // valid tone. Tree-visible (an authored attribute), unlike a `tone` patch prop
  // which is consumed before the tree exists.
  const dataTone = element.dataTone;
  if (typeof dataTone === "string" && !isValidTone(dataTone)) {
    out.push({
      rule: "unknown-tone",
      severity: "warning",
      path: here,
      message: `\`dataTone\` "${dataTone}" is not a valid tone.`,
      hint: 'Use "inherit", "base", a number, or "increase-N"/"decrease-N"/"shift-N" (e.g. "shift-9"). Words like "surface"/"text" are not Domphy tones.',
    });
  }

  walk(content, here, out, false, runReactive);
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
