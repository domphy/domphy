import { type PartialElement, type StyleObject, hashString, toState, type ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function skeleton(props: {
  color?: ValueOrState<ThemeColor>;
} = {}): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

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
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      height: themeSpacing(6),
      display: "block",
      borderRadius: themeSpacing(1),
      backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
      animation: `${animationName} 1.5s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };
}

export { skeleton };
