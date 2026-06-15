import {
  type DomphyElement,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

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
    style: {
      position: "relative",
      "&::after": {
        content: (l) => `"${state.get(l)}"`,
        position: "absolute",
        top: 0,
        right: 0,
        transform: "translate(50%,-50%)",
        paddingInline: themeSpacing(1),
        minWidth: themeSpacing(6),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: (l) => themeSize(l, "decrease-1"),
        borderRadius: themeSpacing(999),
        backgroundColor: (l) => themeColor(l, "shift-9", color.get(l)),
        color: (l) => themeColor(l, "shift-0", color.get(l)),
      },
    },
  };
}

export { badge };
