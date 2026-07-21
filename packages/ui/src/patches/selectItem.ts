import type { PartialElement } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * A single selectable option row (`role="option"`) for use inside a `selectList`. Reads the
 * `select` context to reflect/toggle selection: it sets `aria-selected` from the bound value and
 * toggles the value (single or multiple) on click. Styles hover/selected/focus states.
 *
 * @hostTag div
 * @param props.accentColor - Theme color tone for the selected/focus state. Defaults to `"primary"`.
 * @param props.color - Theme color tone for text/background. Defaults to `"neutral"`.
 * @param props.value - The option value compared against and written to the select state.
 *   Defaults to `null`.
 * @example { div: "Option A", $: [selectItem({ value: "a" })] }
 */
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
      if (node.tagName !== "div") {
        console.warn(`"selectItem" patch must use div tag`);
      }
      const select = node.getContext("select");
      if (select) {
        const state = select.value;
        node.attributes.set("ariaSelected", (listener) => {
          const val = state.get(listener);
          return select.multiple ? val.includes(value) : val === value;
        });
        node.addEvent("click", () => {
          const val = state.get();
          if (select.multiple) {
            val.includes(value)
              ? state.set(val.filter((v: number | string) => v !== value))
              : state.set(val.concat([value]));
          } else {
            val !== value && state.set(value);
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
      color: (listener) => themeColor(listener, "text", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled]):not([aria-selected=true])": {
        backgroundColor: (listener) => themeColor(listener, "hover", color),
      },
      "&[aria-selected=true]": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-6", accentColor),
        color: (listener) => themeColor(listener, "shift-11"),
      },
      transition: "background-color 140ms ease, box-shadow 140ms ease",
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor),
      },
    },
  };
  return partial;
}

export { selectItem };
