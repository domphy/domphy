// Shared style helpers, exported for app/block code that composes its own
// elements and wants the same focus-ring and elevation treatment as the
// built-in patches (instead of hand-rolling outlines/shadows).

export { edge } from "./utils/edge.js";
export type { ElevationLevel } from "./utils/elevation.js";
export { elevation } from "./utils/elevation.js";
export { focusRing } from "./utils/focusRing.js";
