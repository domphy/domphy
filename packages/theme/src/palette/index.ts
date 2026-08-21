// Color-math utilities (CIELAB / Oklab / CIEDE2000 / interpolation helpers).

// Generation: build a WCAG-optimized ramp from one or more anchor colors.
export { generateRamp } from "./Generator.js";
export type { PaletteColors } from "./Palette.js";
export { Palette } from "./Palette.js";
export type { ApcaContrasts, ContrastValue, WcagContrasts } from "./Ramp.js";
export { Ramp } from "./Ramp.js";
// Metrics: validate palette quality in CIELAB.
export { Swatch } from "./Swatch.js";
export * from "./utils.js";
