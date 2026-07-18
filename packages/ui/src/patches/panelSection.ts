import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";

/**
 * A padded section for side-panel/inspector UIs — density-aware padding on
 * all sides, with an optional bottom divider for sections stacked one after
 * another. A thin wrapper: it does not impose flex layout on its children —
 * pair it with `stack()` or `row()` for that. No host-tag check; apply to
 * any block element.
 *
 * @param props.padding - Spacing multiplier for padding on all sides (default 4 = 1em at density 1).
 * @param props.divider - Adds a bottom border, for sections stacked one after another. Defaults to `false`.
 * @param props.color - Theme color tone for the divider border. Defaults to `"neutral"`.
 * @example { div: [{ h3: "Parameters" }, { p: "..." }], $: [panelSection()] }
 * @example
 * { div: [
 *   { div: "Section A", $: [panelSection({ divider: true })] },
 *   { div: "Section B", $: [panelSection()] },
 * ], $: [stack({ gap: 0 })] }
 */
function panelSection(
  props: {
    padding?: number;
    divider?: boolean;
    color?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const { padding = 4, divider = false } = props;
  const color = toState(props.color ?? "neutral", "color");
  return {
    style: {
      padding: (listener) => themeSpacing(themeDensity(listener) * padding),
      ...(divider
        ? {
            borderBottom: (listener) =>
              `1px solid ${themeColor(listener, "border", color.get(listener))}`,
          }
        : {}),
    },
  };
}

export { panelSection };
