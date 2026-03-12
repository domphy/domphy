import { PartialElement, toState, type State } from "@domphy/core";
import { themeSpacing, ThemeColor, themeColor, themeDensity, themeSize } from "@domphy/theme";

function selectItem(props: {
  accentColor?: ThemeColor;
  color?: ThemeColor;
  value?: number | string;
} = {}): PartialElement {
  const {
    accentColor = "primary",
    color = "neutral",
    value = null
  } = props;

  let partial: PartialElement = {
    role: "option",
    _onInit: (node) => {
      if (node.tagName != "div") {
        console.warn(`"selectItem" patch must use div tag`);
      }
      let select = node.getContext("select");
      if (select) {
        let state = select.value
        node.attributes.set("ariaSelected", (listener) => {
          let val = state.get(listener)
          return select.multiple ? val.includes(value) : val == value
        })
        node.addEvent("click", () => {
          let val = state.get()
          if (select.multiple) {
            val.includes(value) ? state.set(val.filter((v: number | string) => v !== value)) : state.set(val.concat([value]))
          } else {
            val != value && state.set(value)
          }
        })
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
      color: (listener) => themeColor(listener, "shift-6", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled]):not([aria-selected=true])": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", color),
      },
      "&[aria-selected=true]": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", accentColor),
        color: (listener) => themeColor(listener, "shift-8"),
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`,
      },
    },
  };
  return partial;
}

export { selectItem };
