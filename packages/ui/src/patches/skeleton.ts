import { type PartialElement, type StyleObject, hashString } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function skeleton(props: {
  color?: ThemeColor;
} = {}): PartialElement {
  const { color = "neutral" } = props;

  const keyframes = {
    "0%,100%": { opacity: 1 },
    "50%": { opacity: .4 }
  }
  const animationName = hashString(JSON.stringify(keyframes))
  return {
    ariaHidden: "true",
    dataTone: "shift-2",
    style: {
      fontSize: (listener) => themeSize(listener),
      color: (listener) => themeColor(listener, "shift-9", color),
      height: themeSpacing(6),
      display: "block",
      borderRadius: themeSpacing(1),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      animation: `${animationName} 1.5s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };
}

export { skeleton };
