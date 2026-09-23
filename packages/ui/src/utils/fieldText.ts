import {
  type Listener,
  type StyleObject,
  toState,
  type ValueOrState,
} from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

/**
 * Tone of an editable field's PLACEHOLDER.
 *
 * MEASURED — `packages/ui/tests/field-text-contrast.test.ts` sweeps all 10
 * built-in roles x the 8 edge anchors (shift-0..3, shift-14..17) x both built-in
 * themes, resolving tones through `resolveToneStep()` so the numbers are the
 * ones the browser paints:
 *
 *   shift-7   worst 2.83:1   fails 142/160
 *   "muted"   worst 3.55:1   fails  40/160
 *   "text"    worst 4.53:1   fails   0/160   <- lowest tone clearing AA
 *
 * WCAG 2.1 SC 1.4.3 covers placeholder text: its only relevant exception is
 * "inactive user interface components", and an editable field is not inactive.
 * So `"text"` is the floor, not a preference.
 */
const PLACEHOLDER_TONE = "text";

/**
 * Tone of the value the user has typed.
 *
 * The placeholder is pinned at the AA floor, so the hint/value distinction has
 * to be made by painting the VALUE stronger — the inverse of MUI/Carbon, whose
 * placeholders sit below AA. Two ramp steps, not one:
 *
 *   "text" vs shift-10   worst CIELAB dE 5.27
 *   "text" vs shift-11   worst CIELAB dE 10.67  (~4.6x the ~2.3 JND)
 *
 * shift-11 also clears AAA on every edge anchor (worst 7.34:1), so the value is
 * never the weaker of the two.
 */
const VALUE_TONE = "shift-11";

/**
 * The `color` + `::placeholder` pair every editable text field paints. Keeping
 * it in one place is what stops the two tones drifting apart per patch (they
 * had, across `inputText` / `inputSearch` / `textarea` / `command`) and keeps
 * the placeholder in the field's own `color` role rather than always neutral.
 */
function fieldTextStyle(
  color: ValueOrState<ThemeColor> = "neutral",
): StyleObject {
  const colorState = toState(color, "color");
  return {
    color: (listener: Listener) =>
      themeColor(listener, VALUE_TONE, colorState.get(listener)),
    "&::placeholder": {
      color: (listener: Listener) =>
        themeColor(listener, PLACEHOLDER_TONE, colorState.get(listener)),
    },
  };
}

export { fieldTextStyle, PLACEHOLDER_TONE, VALUE_TONE };
