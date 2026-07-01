// Color-math utilities (CIELAB / Oklab / CIEDE2000 / interpolation helpers).
export * from "./utils";

// Metrics: validate palette quality in CIELAB.
export { Swatch } from "./Swatch";
export { Ramp } from "./Ramp";
export type { ContrastValue, WcagContrasts, ApcaContrasts } from "./Ramp";
export { Palette } from "./Palette";
export type { PaletteColors } from "./Palette";

// Generation: build a WCAG-optimized ramp from one or more anchor colors.
export { generateRamp } from "./Generator";

