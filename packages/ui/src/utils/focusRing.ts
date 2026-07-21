import type { Listener } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

/**
 * Shared `:focus-visible` ring — ring-offset pattern used by Radix / shadcn /
 * Vercel / Linear:
 *
 *   1. 2px "gap" in the surface tone (reads as space between control + ring)
 *   2. 2px accent halo outside that gap
 *
 * Implemented as a layered `box-shadow` so it composes with a control's own
 * resting outline / elevation instead of replacing them. Prefer this over a
 * flush `0 0 0 2px` ring (looks like a thick pastel border glued to the edge)
 * and over the browser default outline.
 *
 * Accent at `shift-9` stays legible on both light and dark surfaces; the
 * washed `shift-6` flush ring is what made focus look broken in product UIs.
 */
function focusRing(listener: Listener, color: ThemeColor = "primary"): string {
  const gap = themeColor(listener, "surface");
  const ring = themeColor(listener, "shift-9", color);
  return `0 0 0 2px ${gap}, 0 0 0 4px ${ring}`;
}

export { focusRing };
