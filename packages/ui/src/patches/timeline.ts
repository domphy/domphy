import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";

/**
 * Container for a vertical timeline. Sets list reset styles. Apply to `<ol>` or `<ul>`.
 *
 * @example { ol: [...], $: [timeline()] }
 */
function timeline(): PartialElement {
  return {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
    },
  };
}

/**
 * A single event row in a `timeline`. Uses a 2-column grid: the left column holds
 * a dot (`::before`) and optional connector line (`::after`); the right column holds
 * the user's content. Apply to `<li>`.
 *
 * @param props.active - Full-opacity dot (accent color). `ValueOrState<boolean>`, defaults to `false`.
 * @param props.last - Suppress the vertical connector below this item. `boolean`, defaults to `false`.
 * @param props.color - Dot/connector color tone. `ThemeColor`, defaults to `"neutral"`.
 * @param props.accentColor - Active dot color tone. `ThemeColor`, defaults to `"primary"`.
 * @example { li: [{ b: "2024" }, { p: "Event" }], $: [timelineItem({ active: true })] }
 */
function timelineItem(
  props: {
    active?: ValueOrState<boolean>;
    last?: boolean;
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = {},
): PartialElement {
  const { last = false } = props;
  const color = props.color ?? "neutral";
  const accentColor = props.accentColor ?? "primary";
  const activeState = toState(props.active ?? false);

  return {
    style: {
      display: "grid",
      gridTemplateColumns: "2rem 1fr",
      columnGap: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBottom: (listener) =>
        last ? "0" : themeSpacing(themeDensity(listener) * 4),
      position: "relative",

      // Dot
      "&::before": {
        content: '""',
        display: "block",
        width: "0.75rem",
        height: "0.75rem",
        borderRadius: "50%",
        justifySelf: "center",
        marginTop: themeSpacing(1),
        transition: "background-color 200ms ease, opacity 200ms ease",
        backgroundColor: (listener) =>
          themeColor(
            listener,
            "shift-8",
            activeState.get(listener) ? accentColor : color,
          ),
        opacity: (listener) => (activeState.get(listener) ? "1" : "0.4"),
      },

      // Vertical connector to the next item
      ...(last
        ? {}
        : {
            "&::after": {
              content: '""',
              position: "absolute",
              left: "calc(1rem - 1px)",
              top: "1.25rem",
              bottom: (listener) =>
                `-${themeSpacing(themeDensity(listener) * 4)}`,
              width: "2px",
              backgroundColor: (listener) =>
                themeColor(listener, "shift-3", color),
            },
          }),
    },
  };
}

export { timeline, timelineItem };
