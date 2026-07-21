import { themeColorToken } from "@domphy/theme";
import type { GradientObject, ThemeFamily } from "../types.js";

export type Rgba = [number, number, number, number];

// Converts "#rrggbb" or "#rrggbbaa" hex to [r, g, b, a] floats in [0, 1]
export function hexToRgba(hex: string, alpha = 1): Rgba {
  const clean = hex.replace("#", "");
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

// Returns a concrete hex string for the nth series color (light theme, no listener)
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
