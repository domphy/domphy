import { type DomphyElement, ElementNode, toState } from "@domphy/core";
import { themeApply, themeColor } from "@domphy/theme";
import { Render } from "../editor/Render";
import { Toolbar } from "../editor/Toolbar";
import { lockScrollOnFullscreen } from "../editor/fullscreenLock";

export function Container(element: DomphyElement): DomphyElement<"div"> {
  const isDark = toState(false);
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
    div: [Toolbar({ isDark, isFull, hasGrid }), preview],
    style: {
      display: "flex",
      flexDirection: "column",
      border: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      height: (listener) => (isFull.get(listener) ? "100vh" : "280px"),
      // Above the site header's own z-index:100 (packages/press/src/layout.ts)
      // so fullscreen genuinely covers the whole page instead of having its
      // toolbar hidden underneath the sticky header.
      zIndex: (listener) => (isFull.get(listener) ? 300 : 10),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
    },
  };
}
