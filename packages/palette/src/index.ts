// Color-math utilities (CIELAB / Oklab / CIEDE2000 / interpolation helpers).
export * from "./utils";
export * from "./math";

// Metrics: validate palette quality in CIELAB.
export { Swatch } from "./Swatch";
export { Ramp } from "./Ramp";
export type { ContrastValue, WcagContrasts, ApcaContrasts } from "./Ramp";
export { Palette } from "./Palette";
export type { PaletteColors } from "./Palette";

// Generator: produce optimal color ramps (pure-JS, no WASM).
export { generateRamp } from "./generator";

// Optimizer: tune the generator's warp parameters.
export { optimize } from "./optimize";
export type { OptimizeOptions, OptimizeResult } from "./optimize";
