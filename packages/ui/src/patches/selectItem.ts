import { type PartialElement, type State, toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

function selectItem(
  props: {
    accentColor?: ThemeColor;
    color?: ThemeColor;
    value?: number | string;
  } = {},
): PartialElement {
  const { accentColor = "primary", color = "neutral", value = null } = props;

  const partial: PartialElement = {
    role: "option",
    _onInit: (node) => {
      if (node.tagName != "div") {
        console.warn(`"selectItem" patch must use div tag`);
      }
      const select = node.getContext("select");
      if (select) {
        const state = select.value;
        node.attributes.set("ariaSelected", (listener) => {
          const val = state.get(listener);
          return select.multiple ? val.includes(value) : val == value;
        });
        node.addEvent("click", () => {
          const val = state.get();
          if (select.multiple) {
            val.includes(value)
              ? state.set(val.filter((v: number | string) => v !== value))
              : state.set(val.concat([value]));
          } else {
            val != value && state.set(value);
          }
        });
      }
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-9", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled]):not([aria-selected=true])": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", color),
      },
      "&[aria-selected=true]": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-6", accentColor),
        color: (listener) => themeColor(listener, "shift-11"),
      },
      "&:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`,
      },
    },
  };
  return partial;
}

export { selectItem };
