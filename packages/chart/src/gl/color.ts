import { themeColorToken } from "@domphy/theme";
import type { ThemeFamily } from "../types.js";

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

export function familyRgba(family: ThemeFamily, tone = SERIES_TONE, alpha = 1): Rgba {
  return hexToRgba(familyHex(family, tone), alpha);
}
