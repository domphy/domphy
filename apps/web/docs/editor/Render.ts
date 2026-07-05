import type { DomphyElement, State } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

export const Render = (
  element: DomphyElement,
  checked: State<boolean>,
  hasGrid: State<boolean>,
): DomphyElement<"div"> => {
  return {
    div: [element],
    dataTheme: (listener) => (checked.get(listener) ? "dark" : "light"),
    style: {
      position: "relative",
      // `contain: layout` establishes a containing block for `position:
      // fixed` descendants (same effect as `transform`/`filter`/
      // `will-change: transform`, per the CSS spec) — without it, a demo
      // block that anchors itself to the viewport (a scroll-progress bar,
      // a full-page toast/cursor overlay) renders relative to the REAL
      // page instead of this preview box, so it's invisible/mispositioned
      // here (verified live with `scrollProgress`, which sets
      // `position: fixed` at its own root).
      contain: "layout",
      color: (listener) => themeColor(listener, "shift-9"),
      backgroundColor: (listener) => themeColor(listener),
      padding: themeSpacing(9),
      overflow: "auto",
      height: "100%",
      "&::before": {
        content: '""',
        position: "absolute",
        pointerEvents: "none",
        inset: 0,
        backgroundImage: (listener) =>
          hasGrid.get(listener)
            ? `linear-gradient(to bottom,rgba(255, 124, 124, 0.3) 0.5px, transparent 0.5px)`
            : "none",
        backgroundSize: `1px ${themeSpacing(9)}`,
      },
      "&::after": {
        content: '""',
        position: "absolute",
        pointerEvents: "none",
        inset: 0,
        backgroundImage: (listener) =>
          hasGrid.get(listener)
            ? `linear-gradient(to bottom,rgba(255, 122, 122, 0.3) 0.5px, transparent 0.5px)`
            : "none",
        backgroundSize: `1px ${themeSpacing(1)}`,
      },
    },
  };
};
