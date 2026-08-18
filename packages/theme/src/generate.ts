import {
  calcDeltaE2000,
  generateRamp,
  hexToRgb,
  normalizeHex,
  rgbToLab,
} from "./palette/index.js";
import { TONE_STEPS } from "./theme.js";
import type { PartialThemeInput, ThemeInput } from "./types.js";

export type GenerateThemeOptions = {
  /** Ramp length. Must be `TONE_STEPS` (18). Other values throw — a shorter/longer ramp cannot be passed to `setTheme()`. */
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
 * using the built-in palette engine's `generateRamp` (Oklab, WCAG-span-optimized) for
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
 *
 * Each base color is normalized via the palette engine's `normalizeHex`, so
 * shorthand (`#fff`) is accepted; invalid input throws an actionable error
 * naming the offending role.
 */
export function generateTheme(
  baseColors: Record<string, string>,
  options: GenerateThemeOptions = {},
): PartialThemeInput {
  if (options.steps !== undefined && options.steps !== TONE_STEPS) {
    throw new Error(
      `generateTheme() steps must be ${TONE_STEPS} (the tone model is fixed at shift-0…shift-${TONE_STEPS - 1}), got ${options.steps}`,
    );
  }
  const steps = TONE_STEPS;
  const colors: Record<string, string[]> = {};
  const baseTones: Record<string, number> = {};

  for (const [name, hex] of Object.entries(baseColors)) {
    // Normalize first so shorthand (#fff) works and invalid input throws
    // palette's actionable error instead of silently producing #NaNNaNNaN
    // ramps. The role name is prepended so the failing entry is identifiable.
    let normalized: string;
    try {
      normalized = normalizeHex(hex);
    } catch (error) {
      throw new Error(
        `baseColors.${name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const ramp = generateRamp(normalized, steps);
    colors[name] = ramp;
    baseTones[name] = nearestStepIndex(ramp, normalized);
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
