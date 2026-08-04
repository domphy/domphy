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
    // Programmatically focusable (not tabbable): selectBox typeahead and
    // keyboard navigation move focus between options roving-style.
    tabindex: -1,
    // aria-selected and the click toggler must be DECLARED on the partial, not
    // wired imperatively in _onInit: hooks run once per real DOM node, but
    // patch() resets _events and strips undeclared attributes on every
    // ancestor re-render — so imperative wiring was lost on the first reuse
    // while the (once-run) hook never re-installed it. The reactive reader
    // resolves the `select` context lazily through listener.elementNode, so
    // every generation re-binds to whatever context is actually live.
    ariaSelected: (listener) => {
      const select = listener?.elementNode?.getContext("select");
      if (!select) return undefined;
      const val = select.value.get(listener);
      return select.multiple ? val.includes(value) : val === value;
    },
    onClick: (_e, node) => {
      const select = node.getContext("select");
      if (!select) return;
      const state = select.value;
      const val = state.get();
      if (select.multiple) {
        val.includes(value)
          ? state.set(val.filter((v: number | string) => v !== value))
          : state.set(val.concat([value]));
      } else {
        val !== value && state.set(value);
      }
    },
    _onInit: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"selectItem" patch must use div tag`);
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
