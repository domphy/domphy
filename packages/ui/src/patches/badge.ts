import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Renders a small count/label bubble pinned to the top-right corner of its host
 * (via a `::after` pseudo-element). Typically applied to an inline container such
 * as a `<span>` wrapping an icon or element.
 *
 * @param props.color - Badge color tone. Optional `ValueOrState<ThemeColor>`, default "danger".
 * @param props.label - Text/number shown in the badge. Optional `ValueOrState<string | number>`, default 999.
 * @example { span: "🔔", $: [badge({ label: 3, color: "danger" })] }
 */
function badge(
  props: {
    color?: ValueOrState<ThemeColor>;
    label?: ValueOrState<string | number>;
  } = {},
): PartialElement {
  const { label = 999 } = props;
  const state = toState(label);
  const color = toState(props.color ?? "danger", "color");
  return {
    // Badge ::after uses a fixed size scale for the pill chrome.
    _doctorDisable: "inline-typography",
    style: {
      position: "relative",
      "&::after": {
        content: (l) => `"${state.get(l)}"`,
        position: "absolute",
        top: 0,
        right: 0,
        transform: "translate(50%,-50%)",
        paddingInline: themeSpacing(1.5),
        minWidth: themeSpacing(5),
        height: themeSpacing(5),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: (l) => themeSize(l, "decrease-2"),
        fontWeight: "600",
        lineHeight: 1,
        borderRadius: themeSpacing(999),
        backgroundColor: (l) => themeColor(l, "shift-9", color.get(l)),
        color: (l) => themeColor(l, "shift-0", color.get(l)),
        // Hairline ring so the pill pops on same-hue surfaces.
        boxShadow: (l) =>
          `0 0 0 1px ${themeColor(l, "shift-0", color.get(l))}`,
      },
    },
  };
}

export { badge };
