import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a native disclosure widget: a themed `<summary>` header with an
 * animated rotating chevron and an expand/collapse transition on the body
 * content. Apply to a `<details>` element.
 *
 * @hostTag details
 * @param props.color - Theme color tone (`ValueOrState<ThemeColor>`) for the body/summary. Defaults to "neutral".
 * @param props.accentColor - Accent color (`ValueOrState<ThemeColor>`) for the summary's focus outline. Defaults to "primary".
 * @param props.duration - Open/close transition duration in milliseconds. Defaults to 240.
 * @example { details: [{ summary: "More" }, { div: "Body" }], $: [details()] }
 */
function details(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
    duration?: number;
  } = {},
): PartialElement {
  const { duration = 240 } = props;
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "details") {
        console.warn(`"details" primitive patch must use details tag`);
      }
    },
    // Summary weight is design-system chrome for disclosure headers.
    _doctorDisable: "inline-typography",
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),

      overflow: "hidden",
      "& > summary": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", color.get(listener)),
        color: (listener) =>
          themeColor(listener, "shift-10", color.get(listener)),
        fontSize: (listener) => themeSize(listener, "inherit"),
        listStyle: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: themeSpacing(2),
        cursor: "pointer",
        userSelect: "none",
        fontWeight: 500,
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
        height: themeSpacing(10),
      },
      "& > summary::-webkit-details-marker": {
        display: "none",
      },
      "& > summary::marker": {
        content: `""`,
      },
      "& > summary::after": {
        content: `""`,
        width: themeSpacing(2),
        height: themeSpacing(2),
        flexShrink: 0,
        marginTop: `-${themeSpacing(0.5)}`,
        borderInlineEnd: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-9", color.get(listener))}`,
        borderBottom: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-9", color.get(listener))}`,
        transform: "rotate(45deg)",
        transition: `transform ${duration}ms ease`,
      },
      "&[open] > summary::after": {
        transform: "rotate(-135deg)",
      },
      "& > summary:hover": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", color.get(listener)),
      },
      "& > summary:focus-visible": {
        borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
        outlineOffset: `-${themeSpacing(0.5)}`,
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
      },
      "& > :not(summary)": {
        maxHeight: 0,
        opacity: 0,
        overflow: "hidden",
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
        paddingTop: 0,
        paddingBottom: 0,
        transition: `max-height ${duration}ms ease, opacity ${duration}ms ease, padding ${duration}ms ease`,
      },
      "&[open] > :not(summary)": {
        maxHeight: themeSpacing(250),
        opacity: 1,
        paddingTop: (listener) => themeSpacing(themeDensity(listener) * 1),
        paddingBottom: (listener) => themeSpacing(themeDensity(listener) * 3),
      },
    },
  };
}

export { details };
