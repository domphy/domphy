import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * A circular avatar container that centers initials/text and cover-fits any
 * child `<img>`. Typically applied to an inline-flex container such as a `<span>`.
 *
 * @param props.color - Background/foreground color tone. Optional `ValueOrState<ThemeColor>`, default "primary".
 * @example { span: "JD", $: [avatar({ color: "primary" })] }
 */
function avatar(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "primary", "color");

  return {
    dataTone: "shift-2",
    // Design-system initials weight (not app chrome) — consumers use avatar().
    _doctorDisable: "inline-typography",
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: "50%",
      flexShrink: 0,
      width: themeSpacing(9),
      height: themeSpacing(9),
      fontSize: (listener) => themeSize(listener, "inherit"),
      fontWeight: "600",
      userSelect: "none",
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) =>
        themeColor(listener, "shift-11", color.get(listener)),
      // Hairline so the circle separates from same-tone surfaces.
      boxShadow: (listener) =>
        `0 0 0 1px ${themeColor(listener, "border", color.get(listener))}`,
      "& img": {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      },
    },
  };
}

export { avatar };
