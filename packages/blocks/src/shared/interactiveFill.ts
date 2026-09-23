// The `&:hover` / `&[aria-current]` / `&[aria-selected]` fill a shadcn nav row,
// menu row or grid cell paints, WITH the label tone that belongs on it.
//
// Every one of these rows used to write only the background:
//
//   "&:hover": { backgroundColor: (l) => themeColor(l, "shift-2", "neutral") }
//
// leaving the row's resting `color: shift-9` in place. That collapses the
// text/fill ramp gap from 9 to 7 the moment the pointer lands — 361
// `low-contrast` diagnostics across the sidebar family, measured 3.58:1 for
// shift-9 on a shift-2 fill (see `textToneOn`'s docblock in @domphy/theme).
// The label has to travel with its fill, which is what the @domphy/ui
// interactive patches (buttonGhost, list, menu, selectItem, segmented) do.

import type { Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, textToneOn, themeColor } from "@domphy/theme";

/**
 * Background + label for a row filled at `shift-<step>`, keeping the label
 * `CONTRAST_SPAN` ramp steps away from the fill at that state.
 *
 * Spread it where the pseudo-state style goes:
 * `"&:hover": interactiveFill(2)`.
 */
export function interactiveFill(
  step: number,
  color: ThemeColor = "neutral",
): StyleObject {
  return {
    backgroundColor: (listener: Listener) =>
      themeColor(listener, `shift-${step}`, color),
    color: (listener: Listener) =>
      themeColor(listener, textToneOn(step), color),
  };
}
