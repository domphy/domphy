// Color-math utilities (CIELAB / Oklab / CIEDE2000 / interpolation helpers).
export * from "./utils.js";

// Metrics: validate palette quality in CIELAB.
export { Swatch } from "./Swatch.js";
export { Ramp } from "./Ramp.js";
export type { ContrastValue, WcagContrasts, ApcaContrasts } from "./Ramp.js";
export { Palette } from "./Palette.js";
export type { PaletteColors } from "./Palette.js";

// Generation: build a WCAG-optimized ramp from one or more anchor colors.
export { generateRamp } from "./Generator.js";

