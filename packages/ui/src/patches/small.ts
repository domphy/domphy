import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize } from "@domphy/theme";

/**
 * Styles small/secondary text: one step smaller font size (`data-size="decrease-1"`) with a
 * themed foreground color.
 *
 * The tone is `shift-10`, one step ABOVE the `"text"` floor, because this text renders below
 * the WCAG large-text threshold and so must always clear 4.5:1. Measured in Chromium on the
 * built bundle: 6.01–7.73:1 (light) and 6.33–7.73:1 (dark) on every edge-anchored surface.
 * Three things at the CALL SITE forfeit that guarantee, all measured in Chromium:
 * 1. A host-declared `style.color` wins over the patch (native beats patch) — `"text"` /
 *    `shift-9` on a `shift-1` surface is 4.23:1. Pass `color` for a different family
 *    instead of restyling.
 * 2. An ancestor's scoped `"& small": { color: … }` also wins: that descendant selector is
 *    specificity (0,1,1) and this patch's own generated class is only (0,1,0). Measured
 *    inside a correctly tone-anchored `dataTone: "shift-1"` card, with no inline style on
 *    the `<small>` at all: `& small { color: themeColor(l, "shift-8") }` resolves to
 *    `var(--neutral-9)` = #707070 on the card's #ededed = 4.23:1 (6.27:1 once the `color`
 *    line is dropped). The specificity is deliberately NOT escalated here — a patch that
 *    outranked descendant rules would leave an author no way to restyle short of
 *    `!important`. Scope layout there (`display: block`) and leave the colour to the patch.
 * 3. A surface tinted with a fixed `themeColor(l, "shift-N")` background and no `dataTone`:
 *    every child still resolves against the page root, and even `shift-10` drops to 4.34:1
 *    (shift-2 tint) and 3.67:1 (shift-3). Shift the surface with `dataTone` + `"inherit"`
 *    instead — `@domphy/doctor`'s `tone-background-inherit` rule flags exactly this.
 *
 * @hostTag small
 * @param props.color - Theme color tone for the text. Accepts a value or reactive state.
 *   Defaults to `"neutral"`.
 * @example { small: "fine print", $: [small()] }
 */
function small(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "small") {
        console.warn('"small" patch must use small tag');
      }
    },
    dataSize: "decrease-1",
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      // shift-10 (not muted/shift-8) keeps WCAG AA ≥4.5:1 on light surfaces for small type.
      color: (listener) =>
        themeColor(listener, "shift-10", color.get(listener)),
    },
  };
}

export { small };
