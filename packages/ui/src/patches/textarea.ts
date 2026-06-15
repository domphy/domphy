import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a multi-line text input (border, focus/hover/invalid/disabled states)
 * on the host `<textarea>` element, with optional auto-resize to content.
 *
 * @hostTag textarea
 * @param props.color - Theme color for the border and text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for hover/focus outline. Optional, accepts a value or state. Defaults to `"primary"`.
 * @param props.autoResize - When true, grows the textarea height to fit its content on input. Optional. Defaults to `false`.
 * @example { textarea: null, $: [textarea({ autoResize: true })] }
 */
function textarea(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
    autoResize?: boolean;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");
  const { autoResize = false } = props;

  return {
    _onInsert: (node) => {
      if (node.tagName !== "textarea") {
        console.warn(`"textarea" primitive patch must use textarea tag`);
      }
    },
    _onMount: (node) => {
      if (autoResize) {
        const el = node.domElement as HTMLTextAreaElement;
        el.style.overflow = "hidden";
        const resize = () => {
          el.style.height = "auto";
          el.style.height = el.scrollHeight + "px";
        };
        el.addEventListener("input", resize);
        resize();
      }
    },
    style: {
      fontFamily: "inherit",
      lineHeight: "inherit",
      resize: "vertical",
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      border: "none",
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-7"),
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor.get(listener))}`,
      },
      "&:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
      },
      "&:invalid": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "shift-8", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
      },
    },
  };
}

export { textarea };
