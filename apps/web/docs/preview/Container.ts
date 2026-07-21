import { type DomphyElement, ElementNode, toState } from "@domphy/core";
import { themeApply, themeColor, themeSpacing } from "@domphy/theme";
import { lockScrollOnFullscreen } from "../editor/fullscreenLock";
import { Render } from "../editor/Render";
import { Toolbar } from "../editor/Toolbar";

/**
 * Live preview shell (no source editor) — same product chrome as the full
 * playground so Docs pages that only mount a DomphyPreview feel consistent.
 */
export function Container(element: DomphyElement): DomphyElement<"div"> {
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
      border: (listener) =>
        `1px solid ${themeColor(listener, "border-strong")}`,
      borderRadius: (listener) =>
        isFull.get(listener) ? "0" : themeSpacing(3),
      overflow: "hidden",
      position: (listener) => (isFull.get(listener) ? "fixed" : "relative"),
      inset: 0,
      height: (listener) =>
        isFull.get(listener) ? "100dvh" : "clamp(360px, 52svh, 640px)",
      boxShadow: (listener) =>
        isFull.get(listener)
          ? "none"
          : "0 8px 30px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06)",
      zIndex: (listener) => (isFull.get(listener) ? 300 : 10),
      backgroundColor: (listener) => themeColor(listener, "surface"),
      color: (listener) => themeColor(listener, "text"),
    },
  };
}
