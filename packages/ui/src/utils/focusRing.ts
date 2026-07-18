import type { Listener } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

/**
 * Shared `:focus-visible` ring: a 2px halo in the given accent tone, drawn via
 * box-shadow so it composes with a control's own outline-based resting border
 * instead of replacing it. Used across interactive patches (button, inputs,
 * select, textarea, segmented, tabs, toggleGroup, rating, pagination) so focus
 * reads the same way everywhere instead of each patch picking its own style.
 */
function focusRing(listener: Listener, color: ThemeColor = "primary"): string {
  return `0 0 0 2px ${themeColor(listener, "shift-6", color)}`;
}

export { focusRing };
