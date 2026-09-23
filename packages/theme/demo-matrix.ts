// Pure constants shared between demo-main.ts (mounts the matrix in a real
// browser) and e2e/tokens.spec.ts (recomputes expected values in Node via
// resolveThemeColor()). No DOM/browser code here — the spec file imports
// this module directly under the Playwright test runner's Node context,
// where `document` does not exist.
import type { ElementTone } from "./src/tone.js";

export const THEMES = ["light", "dark"] as const;
// The 6 edge-anchor surfaces AGENTS.md prescribes (shift-0..3 light edge,
// shift-14..17 dark edge) plus "inherit" (context 0, no dataTone ancestor).
export const SURFACES = [
  "inherit",
  "shift-0",
  "shift-1",
  "shift-3",
  "shift-14",
  "shift-17",
] as const;
// Same 14-tone sample packages/theme/tests/theme-api.test.ts's
// "resolveToneStep (context-aware off-DOM resolution)" describe block uses —
// every grammar shape (aliases, raw shift-N, increase-/decrease-N, base).
export const TONES: ElementTone[] = [
  "inherit",
  "surface",
  "hover",
  "border",
  "muted",
  "text",
  "shift-0",
  "shift-9",
  "shift-17",
  "increase-2",
  "increase-9",
  "decrease-2",
  "decrease-9",
  "base",
];
export const COLORS = ["neutral", "primary", "error"] as const;

// textToneOn()/textToneOnRampEdge() sampling: `ambient` is the dataTone the
// fill/label pair sits on (the "page" context the docblock's `object` param
// resolves against) — "inherit" hits the documented darkBias trap directly
// (the dark theme's ambient context 0 is bias-lifted to 1), and "shift-3" is
// a raised-panel context representative of a real hover/press surface.
// `fill` is the RELATIVE shift-N distance from that ambient, mirroring the
// "hover" pattern in both functions' own docblock examples (background and
// label both resolve from the SAME node's listener/context).
export const AMBIENTS = ["inherit", "shift-3"] as const;
export const FILLS = [0, 3, 6, 9, 12, 15, 17];
