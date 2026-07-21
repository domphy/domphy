import { type DomphyElement, ElementNode, toState } from "@domphy/core";
import { themeApply, themeColor, themeSpacing } from "@domphy/theme";
import { lockScrollOnFullscreen } from "../editor/fullscreenLock";
import { Render } from "../editor/Render";
import { Toolbar } from "../editor/Toolbar";

export function Container(element: DomphyElement): DomphyElement<"div"> {
  // Match the site's current theme on mount (see editor/Container.ts).
  const isDark = toState(
    document.documentElement.getAttribute("data-theme") === "dark",
  );
  const hasGrid = toState(false);
  const isFull = toState(false);
  lockScrollOnFullscreen(isFull);

  const preview: DomphyElement<"div"> = {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement as HTMLElement;
      const shadow = dom.attachShadow({ mode: "open" });
      const themeTag = document.createElement("style");
      const container = document.createElement("div");
      container.style.flex = "1";
      container.style.minHeight = "0";
      shadow.append(themeTag, container);
      themeApply(themeTag);
      new ElementNode(Render(element, isDark, hasGrid)).render(container);
    },
    style: {
      flex: "1",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
    },
  };

  return {
    div: [Toolbar({ isDark, isFull, hasGrid, title: "Preview" }), preview],
    style: {
      display: "flex",
      flexDirection: "column",
      border: (listener) => `1px solid ${themeColor(listener, "border")}`,
      borderRadius: (listener) =>
        isFull.get(listener) ? "0" : themeSpacing(2),
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      height: (listener) =>
        isFull.get(listener) ? "100vh" : "clamp(240px, 38svh, 400px)",
      // Above the site header's own z-index:100 (packages/press/src/layout.ts)
      // so fullscreen genuinely covers the whole page instead of having its
      // toolbar hidden underneath the sticky header.
      zIndex: (listener) => (isFull.get(listener) ? 300 : 10),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "text"),
    },
  };
}
