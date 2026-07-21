import {
  calcDeltaE2000,
  generateRamp,
  hexToRgb,
  rgbToLab,
} from "@domphy/palette";
import type { PartialThemeInput, ThemeInput } from "./types.js";

export type GenerateThemeOptions = {
  /** Ramp length. Must match `@domphy/theme`'s tone scale (18 steps: shift-0..shift-17). */
  steps?: number;
  direction?: ThemeInput["direction"];
  fontSizes?: string[];
  densities?: number[];
  darkBias?: number;
  custom?: Record<string, string | number>;
};

const DEFAULT_FONT_SIZES = [
  "0.75rem",
  "0.875rem",
  "1rem",
  "1.25rem",
  "1.5625rem",
  "1.9375rem",
  "2.4375rem",
  "3.0625rem",
];
const DEFAULT_DENSITIES = [0.75, 1, 1.5, 2, 2.5];

// The step whose color is perceptually closest (CIEDE2000) to the caller's
// original base color — the ramp's "base tone" is not always the mathematical
// center, since the warp curve does not distribute steps symmetrically.
function nearestStepIndex(ramp: string[], baseHex: string): number {
  const baseLab = rgbToLab(hexToRgb(baseHex));
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ramp.length; i++) {
    const dist = calcDeltaE2000(baseLab, rgbToLab(hexToRgb(ramp[i])));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Generate a complete `ThemeInput` from one base hex color per semantic role,
 * using `@domphy/palette`'s `generateRamp` (Oklab, WCAG-span-optimized) for
 * every color family. Each family's `baseTones` entry is the step nearest
 * (CIEDE2000) to the caller's original input, so `themeColor(l, "base", name)`
 * still resolves to (approximately) the exact brand color that was passed in.
 *
 * ```ts
 * const theme = generateTheme({
 *   primary: "#4a7ff4",
 *   secondary: "#d8597d",
 *   neutral: "#8d8d8d",
 * })
 * ```
 *
 * Roles not passed are simply absent from the result — merge with an existing
 * `ThemeInput`/`PartialThemeInput` (e.g. spread over `light` from
 * `@domphy/theme`) to fill in the rest.
 */
export function generateTheme(
  baseColors: Record<string, string>,
  options: GenerateThemeOptions = {},
): PartialThemeInput {
  const steps = options.steps ?? 18;
  const colors: Record<string, string[]> = {};
  const baseTones: Record<string, number> = {};

  for (const [name, hex] of Object.entries(baseColors)) {
    const ramp = generateRamp(hex, steps);
    colors[name] = ramp;
    baseTones[name] = nearestStepIndex(ramp, hex);
  }

  return {
    direction: options.direction ?? "darken",
    colors,
    baseTones,
    fontSizes: options.fontSizes ?? DEFAULT_FONT_SIZES,
    densities: options.densities ?? DEFAULT_DENSITIES,
    darkBias: options.darkBias ?? 1,
    custom: options.custom ?? {},
  };
}
