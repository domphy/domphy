import type { DomphyElement, PartialElement, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

// Tabler Icons (MIT) — eye and eye-off outlines.
const EYE_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
  `width="1em" height="1em">` +
  `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>` +
  `<path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>` +
  `<path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>` +
  `</svg>`;

const EYE_OFF_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
  `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
  `width="1em" height="1em">` +
  `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>` +
  `<path d="M10.585 10.587a2 2 0 0 0 2.829 2.828"/>` +
  `<path d="M16.681 16.673a8.717 8.717 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6` +
  `c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.146a9.055 9.055 0 0 1 1.82 -.18` +
  `c3.6 0 6.6 2 9 6c-.666 1.11 -1.379 2.067 -2.138 2.87"/>` +
  `<path d="M3 3l18 18"/>` +
  `</svg>`;

/**
 * Password input wrapper: a styled `<div>` that inserts an `<input type="password">`
 * and a show/hide toggle button. The outer div carries the focus-ring outline via
 * `:focus-within`. Apply to an empty `<div>`.
 *
 * @hostTag div
 * @param props.color - Base color tone for border/background/text. Defaults to `"neutral"`.
 * @param props.accentColor - Accent outline color on focus-within. Defaults to `"primary"`.
 * @example { div: null, $: [inputPassword()] }
 */
function inputPassword(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const colorState = toState(props.color ?? "neutral", "color");
  const accentState = toState(props.accentColor ?? "primary", "accentColor");
  const visibleState = toState(false);

  return {
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn('"inputPassword" patch must use div tag');
      }
    },
    // Build the input/toggle as real child elements (not imperative DOM
    // mutation in _onMount) so generateHTML()/SSR emits the actual markup.
    _onInit: (node) => {
      const field: DomphyElement<"input"> = {
        input: null,
        type: (l) => (visibleState.get(l) ? "text" : "password"),
        style: {
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          backgroundColor: "transparent",
          padding: 0,
          margin: 0,
          font: "inherit",
          color: "inherit",
        },
      };

      const toggle: DomphyElement<"button"> = {
        button: (l) => (visibleState.get(l) ? EYE_OFF_SVG : EYE_SVG),
        type: "button",
        ariaLabel: (l) =>
          visibleState.get(l) ? "Hide password" : "Show password",
        onClick: () => visibleState.set(!visibleState.get()),
        style: {
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          color: "inherit",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          opacity: 0.6,
        },
      };

      node.children.insert(field);
      node.children.insert(toggle);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: (l) => themeSpacing(themeDensity(l) * 1),
      paddingBlock: (l) => themeSpacing(themeDensity(l) * 1),
      paddingInline: (l) => themeSpacing(themeDensity(l) * 3),
      borderRadius: (l) => themeSpacing(themeDensity(l) * 1.5),
      border: "none",
      outlineOffset: "-1px",
      outline: (l) =>
        `1px solid ${themeColor(l, "border-strong", colorState.get(l))}`,
      color: (l) => themeColor(l, "text", colorState.get(l)),
      backgroundColor: (l) => themeColor(l, "inherit", colorState.get(l)),
      fontSize: (l) => themeSize(l, "inherit"),
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&:hover:not(:has([disabled])):not(:focus-within)": {
        outline: (l) =>
          `1px solid ${themeColor(l, "shift-5", accentState.get(l))}`,
      },
      "&:focus-within": {
        boxShadow: (l) => focusRing(l, accentState.get(l)),
      },
    } as StyleObject,
  };
}

export { inputPassword };
