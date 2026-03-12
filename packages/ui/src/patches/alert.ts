import type { PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function alert(props: {
  color?: ThemeColor;
} = {}): PartialElement {
  const { color = "primary" } = props;

  return {
    role: "alert",
    // Alert is a semantic surface block, so it should shift the local surface context.
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: themeSpacing(3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
      boxShadow: (listener) => `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-8", color)}`,
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      color: (listener) => themeColor(listener, "shift-10", color),
      fontSize: (listener) => themeSize(listener, "inherit"),
    },
  };
}

export { alert };
