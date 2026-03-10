import type { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function alert(props: {
  color?: ThemeColor;
} = {}): PartialElement {
  const { color = "primary" } = props;

  return {
    role: "alert",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: themeSpacing(3),
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(4),
      boxShadow: (listener) => `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-5", color)}`,
      backgroundColor: (listener) => themeColor(listener, "shift-1", color),
      color: (listener) => themeColor(listener, "shift-7", color),
      fontSize: (listener) => themeSize(listener, "inherit"),
    },
  };
}

export { alert };
