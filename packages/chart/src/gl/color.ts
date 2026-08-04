import { COLOR_ROLES, themeColor, themeColorToken } from "@domphy/theme";
import type { GradientObject, ThemeFamily } from "../types.js";

export type Rgba = [number, number, number, number];

// Converts "#rgb"/"#rgba"/"#rrggbb"/"#rrggbbaa" hex to [r, g, b, a] floats in
// [0, 1]. Short forms are expanded first — without expansion "#fff" parsed as
// r=ff, g=f, b=NaN and fed NaN straight into WebGL uniforms. Invalid digits
// still yield NaN channels; callers on the uniform path guard for that
// (createColorResolver falls back to the series palette).
export function hexToRgba(hex: string, alpha = 1): Rgba {
  let clean = hex.replace("#", "");
  if (clean.length === 3 || clean.length === 4) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : alpha;
  return [r, g, b, a];
}

// Series color rotation order — ThemeFamily semantic names
const SERIES_PALETTE: ThemeFamily[] = [
  "primary",
  "secondary",
  "success",
  "warning",
  "error",
  "info",
  "highlight",
  "attention",
  "danger",
];

export function seriesPaletteFamily(index: number): ThemeFamily {
  return SERIES_PALETTE[index % SERIES_PALETTE.length];
}

// Tone used for series fill color (strong, readable on chart background)
const SERIES_TONE = "shift-9";

// The known theme color roles — used to tell a bare ThemeFamily name ("primary")
// apart from an arbitrary CSS color string without ever throwing.
const THEME_FAMILIES = new Set<string>(COLOR_ROLES);

export function isThemeFamily(src: unknown): src is ThemeFamily {
  return typeof src === "string" && THEME_FAMILIES.has(src);
}

// Returns a concrete hex string for the nth series color.
// Static light-theme, design-time helper — for anything painted into the live
// DOM prefer seriesColor(), which flips with [data-theme] at paint time.
export function seriesHex(index: number): string {
  return themeColorToken(null, SERIES_TONE, seriesPaletteFamily(index));
}

export function seriesRgba(index: number, alpha = 1): Rgba {
  return hexToRgba(seriesHex(index), alpha);
}

// Resolves a ThemeFamily + optional tone to hex (no listener = light theme default)
export function familyHex(family: ThemeFamily, tone = SERIES_TONE): string {
  return themeColorToken(null, tone, family);
}

export function familyRgba(
  family: ThemeFamily,
  tone = SERIES_TONE,
  alpha = 1,
): Rgba {
  return hexToRgba(familyHex(family, tone), alpha);
}

// Returns the var(--…) CSS reference for the nth series color. The reference
// resolves at paint time against the nearest [data-theme] ancestor, so SVG/HTML
// chart layers follow theme flips without a re-render. This is the recommended
// default for series colors (seriesHex stays as the static design-time helper).
export function seriesColor(index: number): string {
  return themeColor(null, SERIES_TONE, seriesPaletteFamily(index));
}

// Same as seriesColor but for an explicit ThemeFamily + tone.
export function familyCss(family: ThemeFamily, tone = SERIES_TONE): string {
  return themeColor(null, tone, family);
}

// CSS/SVG-paint-safe color for any accepted color source:
//   ThemeFamily name → var(--…) reference (paint-time theme awareness)
//   "#hex" / "rgb(…)"/"rgba(…)" / "var(--…)" → passed through unchanged
//   anything else (unknown CSS keyword, gradient object, null) → series palette fallback
export function cssColor(src: unknown, fallbackIndex: number): string {
  if (src == null || src === "" || isGradient(src)) {
    return seriesColor(fallbackIndex);
  }
  const s = String(src);
  if (s.startsWith("#") || s.startsWith("rgb") || s.startsWith("var(")) {
    return s;
  }
  if (isThemeFamily(s)) return familyCss(s);
  return seriesColor(fallbackIndex);
}

// Per-render-pass color resolution. WebGL uniforms need concrete floats, but
// the concrete value of a theme color depends on the element's position in the
// tree ([data-theme] ancestors, custom themes). ChartEngine.render() builds one
// resolver per pass and threads it through every renderer; results are cached
// for the lifetime of the pass, and a theme flip triggers a fresh render (see
// the chart() patch) with a fresh resolver.
export interface ColorResolver {
  // SVG/HTML paint string (var(--…) reference or concrete CSS color).
  css(src: unknown, fallbackIndex: number): string;
  // Concrete float RGBA for WebGL uniforms. Never throws — unresolvable
  // sources (e.g. a bare family name where a hex was expected, an unknown
  // keyword) fall back to the series palette color at fallbackIndex.
  rgba(src: unknown, fallbackIndex: number, alpha?: number): Rgba;
}

// Parses a computed-style color value ("#hex" or "rgb(…)") to floats, or null
// when the value is missing/unparseable (NaN-guarded).
function parseCssColor(value: string): Rgba | null {
  let rgba: Rgba | null = null;
  if (value.startsWith("#")) rgba = hexToRgba(value);
  else if (value.startsWith("rgb")) rgba = parseRgbaString(value);
  if (!rgba || rgba.some((channel) => Number.isNaN(channel))) return null;
  return rgba;
}

export function createColorResolver(el: HTMLElement): ColorResolver {
  const varCache = new Map<string, Rgba | null>();

  // Reads a var(--…) reference through the element's computed style, so the
  // resolved value honors [data-theme] ancestors and custom themes. Returns
  // null when the custom property is unavailable (SSR, jsdom, detached node).
  const lookupVar = (varRef: string): Rgba | null => {
    const cached = varCache.get(varRef);
    if (cached !== undefined) return cached;
    let resolved: Rgba | null = null;
    try {
      const varName = varRef.slice(4, -1).trim();
      const value = getComputedStyle(el).getPropertyValue(varName).trim();
      if (value) resolved = parseCssColor(value);
    } catch {
      // getComputedStyle unavailable — fall through to the static fallback
    }
    varCache.set(varRef, resolved);
    return resolved;
  };

  const withAlpha = (rgba: Rgba, alpha: number): Rgba => [
    rgba[0],
    rgba[1],
    rgba[2],
    rgba[3] * alpha,
  ];

  const familyToRgba = (family: ThemeFamily, alpha: number): Rgba => {
    const computed = lookupVar(familyCss(family));
    if (computed) return withAlpha(computed, alpha);
    // Static light-theme fallback when custom properties cannot be read.
    return familyRgba(family, SERIES_TONE, alpha);
  };

  return {
    css: (src, fallbackIndex) => cssColor(src, fallbackIndex),
    rgba(src, fallbackIndex, alpha = 1) {
      if (src == null || src === "" || isGradient(src)) {
        return familyToRgba(seriesPaletteFamily(fallbackIndex), alpha);
      }
      const s = String(src);
      if (s.startsWith("#")) {
        const parsed = hexToRgba(s, alpha);
        // Invalid hex (bad digits/length) parses to NaN — fall back to the
        // series palette instead of feeding NaN into a WebGL uniform.
        if (parsed.some((channel) => Number.isNaN(channel))) {
          return familyToRgba(seriesPaletteFamily(fallbackIndex), alpha);
        }
        return parsed;
      }
      if (s.startsWith("rgb")) {
        const parsed = withAlpha(parseRgbaString(s), alpha);
        // An unparseable rgb()/rgba() string falls through hexToRgba and
        // yields NaN — same palette fallback as invalid hex.
        if (parsed.some((channel) => Number.isNaN(channel))) {
          return familyToRgba(seriesPaletteFamily(fallbackIndex), alpha);
        }
        return parsed;
      }
      if (s.startsWith("var(")) {
        const computed = lookupVar(s);
        if (computed) return withAlpha(computed, alpha);
        return familyToRgba(seriesPaletteFamily(fallbackIndex), alpha);
      }
      if (isThemeFamily(s)) return familyToRgba(s, alpha);
      // Unknown color keyword — WebGL cannot parse it; use the palette fallback
      // instead of throwing (a hex/rgb user color once crashed familyRgba here).
      return familyToRgba(seriesPaletteFamily(fallbackIndex), alpha);
    },
  };
}

// Resolve any color value (hex string, ThemeFamily name, or undefined) to Rgba
export function resolveColorSrc(src: unknown, fallback: Rgba): Rgba {
  if (!src) return fallback;
  const s = String(src);
  return s.startsWith("#") || s.startsWith("rgb")
    ? hexToRgba(s)
    : familyRgba(src as ThemeFamily);
}

// Parse "rgba(r,g,b,a)" or "rgb(r,g,b)" string to Rgba
function parseRgbaString(color: string): Rgba {
  const m = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!m) return hexToRgba(color);
  return [
    parseFloat(m[1]) / 255,
    parseFloat(m[2]) / 255,
    parseFloat(m[3]) / 255,
    m[4] !== undefined ? parseFloat(m[4]) : 1,
  ];
}

function colorStopToRgba(color: string): Rgba {
  if (color.startsWith("#")) return hexToRgba(color);
  if (color.startsWith("rgb")) return parseRgbaString(color);
  return familyRgba(color as ThemeFamily);
}

export function isGradient(src: unknown): src is GradientObject {
  return (
    typeof src === "object" &&
    src !== null &&
    "type" in src &&
    ((src as any).type === "linear" || (src as any).type === "radial")
  );
}

// Extract top/bottom Rgba from a gradient object (2-stop simplification for WebGL)
export function gradientEndpoints(
  grad: GradientObject,
  fallback: Rgba,
): { top: Rgba; bottom: Rgba } {
  const stops = grad.colorStops ?? [];
  if (stops.length === 0) return { top: fallback, bottom: fallback };
  if (stops.length === 1) {
    const c = colorStopToRgba(stops[0].color);
    return { top: c, bottom: c };
  }
  // Use first and last stop for top/bottom
  const top = colorStopToRgba(stops[0].color);
  const bottom = colorStopToRgba(stops[stops.length - 1].color);
  // Respect gradient direction: x2/y2 — if y2=0 and y=1, gradient is bottom-to-top
  if (grad.type === "linear") {
    const g = grad as import("../types.js").LinearGradient;
    if (g.y > g.y2) return { top: bottom, bottom: top };
  }
  return { top, bottom };
}
