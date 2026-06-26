import { type DomphyElement, ElementNode, toState } from "@domphy/core";
import { themeApply, themeColor } from "@domphy/theme";
import { Render } from "../editor/Render";
import { Toolbar } from "../editor/Toolbar";

export function Container(element: DomphyElement): DomphyElement<"div"> {
  const isDark = toState(false);
  const hasGrid = toState(false);
  const isFull = toState(false);

  const preview: DomphyElement<"div"> = {
    div: [],
    _onMount: (node) => {
      const dom = node.domElement as HTMLElement;
      const shadow = dom.attachShadow({ mode: "open" });
      const themeTag = document.createElement("style");
      const container = document.createElement("div");
      container.style.flex = "1";
      shadow.append(themeTag, container);
      themeApply(themeTag);
      new ElementNode(Render(element, isDark, hasGrid)).render(container);
    },
    style: {
      flex: "1",
      display: "flex",
      flexDirection: "column",
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
      zIndex: 10,
      backgroundColor: (listener) => themeColor(listener, "inherit"),
    },
  };
}
