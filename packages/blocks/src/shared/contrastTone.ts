// Ramp tone for text painted directly ON a filled shape (a pie wedge, a radial
// arc) rather than on the ambient surface.
//
// Domphy tone steps are THEME-RELATIVE: `shift-0` is the page surface in both
// themes, so a hard-coded `shift-0` label renders white under the light theme
// and BLACK under the dark theme. Measured in Chromium at `data-theme="dark"`:
// chartPieLabelList's "Chrome" label and every chartRadialLabel inline label
// were black text on a dark-navy fill (see the screenshots in the 0.2.4 audit)
// — and the same fixed tone was already failing on the LIGHT end of the
// palette under the light theme (white text on the `shift-4` wedge).

import type { ElementNode, Listener } from "@domphy/core";
import { type ElementTone, textToneOnRampEdge } from "@domphy/theme";

/**
 * Given the ramp tone a shape is FILLED with, returns the ramp tone to paint
 * text on top of it: whichever end of the ramp is at least `CONTRAST_SPAN`
 * steps away.
 *
 * Thin wrapper over `@domphy/theme`'s `textToneOnRampEdge()` — pass the
 * listener/node you have (the same value `themeColor()`'s first argument
 * takes) so it resolves the fill's real post-`darkBias` ramp step, same as
 * `textToneOn()`'s own bias-aware branch; without one it falls back to an
 * unbiased-space estimate, exact only on a theme's default (unshifted) edge.
 *
 * Not `textToneOn()` from `@domphy/theme` directly. That one returns the tone
 * exactly `CONTRAST_SPAN` steps away — the AA FLOOR — which is the right
 * answer for a control label that must track a moving hover/pressed fill. A
 * chart label is painted on a fixed, saturated wedge and upstream shadcn
 * paints it `fill-white` / `fill-background`: a crisp end-of-ramp label, not
 * a mid-ramp grey. Measured against the `primary` fills these charts actually
 * use (`shift-4`…`shift-12`, `PIE_CHART_PALETTE` / `CHART_BAR_SERIES_TONES`),
 * light theme: end-of-ramp 10.30 / 6.94 / 4.55 / 7.18 / 11.20 : 1 versus
 * `textToneOn()` 5.75 / 5.87 / 4.55 / 6.13 / 6.83 : 1 (dark theme mirrors it).
 * Both clear AA; only the end of the ramp keeps upstream's crisp look.
 */
export function textToneOnFill(
  fillTone: string,
  object: ElementNode | Listener | null = null,
): ElementTone {
  return textToneOnRampEdge(fillTone, object);
}
