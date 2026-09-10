import {
  type BehaviorInstance,
  behavior,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a multi-line text input (border, focus/hover/invalid/disabled states)
 * on the host `<textarea>` element, with optional auto-resize to content.
 *
 * @hostTag textarea
 * @param props.color - Theme color for the border and text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for hover/focus outline. Optional, accepts a value or state. Defaults to `"primary"`.
 * @param props.autoResize - When true, grows the textarea height to fit its content on input and when `value` updates, and remeasures when the host becomes visible (IntersectionObserver) and when its box size changes (ResizeObserver). Optional. Defaults to `false`.
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
    // Resize on mount, on input, and when the host `value` attribute updates
    // (controlled writes skip the input event).
    ...behavior(
      "textarea-auto-resize",
      (node, initial) => {
        const el = node.domElement as HTMLTextAreaElement;
        let enabled = initial.autoResize;
        let measuring = false;
        let intersectionObserver: IntersectionObserver | undefined;
        let resizeObserver: ResizeObserver | undefined;
        const resize = () => {
          if (!enabled || measuring) return;
          measuring = true;
          // Unobserve during the height write so ResizeObserver cannot
          // re-enter from the measure itself (jsdom may deliver RO sync).
          resizeObserver?.unobserve(el);
          el.style.overflow = "hidden";
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
          measuring = false;
          if (enabled) resizeObserver?.observe(el);
        };
        const observe = () => {
          if (typeof IntersectionObserver !== "undefined") {
            if (!intersectionObserver) {
              intersectionObserver = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) resize();
              });
            }
            intersectionObserver.observe(el);
          }
          if (typeof ResizeObserver !== "undefined") {
            if (!resizeObserver) {
              resizeObserver = new ResizeObserver(() => {
                if (measuring) return;
                resize();
              });
            }
            resizeObserver.observe(el);
          }
        };
        const unobserve = () => {
          intersectionObserver?.unobserve(el);
          resizeObserver?.unobserve(el);
        };
        el.addEventListener("input", resize);
        node.attributes.addListener("value", resize);
        if (enabled) {
          observe();
          resize();
        }
        return {
          resize,
          update(next) {
            enabled = next.autoResize;
            node.attributes.addListener("value", resize);
            if (enabled) {
              observe();
              resize();
            } else {
              unobserve();
            }
          },
          destroy() {
            el.removeEventListener("input", resize);
            intersectionObserver?.disconnect();
            resizeObserver?.disconnect();
          },
        };
      },
      { autoResize },
    ),
    _onUpdate: (node) => {
      node
        .getBehavior<
          BehaviorInstance<{ autoResize: boolean }> & { resize: () => void }
        >("textarea-auto-resize")
        ?.resize();
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
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-7"),
      },
      "&:hover:not([disabled]):not([aria-busy=true])": {
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-5", accentColor.get(listener))}`,
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&:invalid": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        color: (listener) => themeColor(listener, "muted", "neutral"),
        outline: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
      },
    },
  };
}

export { textarea };
