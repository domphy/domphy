import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { figure } from "@domphy/ui";

const App: DomphyElement<"figure"> = {
  figure: [
    {
      svg: [
        {
          circle: null,
          cx: "50",
          cy: "50",
          r: "42",
          fill: "none",
          strokeWidth: "8",
          style: {
            stroke: (listener) => themeColor(listener, "shift-3", "neutral"),
          },
        },
        {
          circle: null,
          cx: "50",
          cy: "50",
          r: "42",
          fill: "none",
          strokeWidth: "8",
          strokeLinecap: "round",
          strokeDasharray: "264",
          strokeDashoffset: "74",
          style: {
            stroke: (listener) => themeColor(listener, "shift-6", "primary"),
          },
        },
      ],
      viewBox: "0 0 100 100",
      role: "img",
      ariaLabel: "Completion chart",
      // The chart panel is its own surface: declare it with dataTone and let
      // the background inherit, so the strokes below shift with it. Painting a
      // fixed "shift-1" here instead pins them to the page context.
      dataTone: "shift-1",
      style: {
        width: "100%",
        maxWidth: themeSpacing(40),
        backgroundColor: (listener) => themeColor(listener, "inherit"),
        color: (listener) => themeColor(listener, "text"),
        padding: themeSpacing(3),
        borderRadius: themeSpacing(2),
      },
    },
    {
      figcaption:
        "Figure 1. Circular completion chart with context-aware colors.",
    },
  ],
  $: [figure()],
};

export default App;
