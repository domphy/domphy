import type { DomphyElement, PartialElement, ElementNode } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

type ToastPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

function toast(props: {
  position?: ToastPosition;
  color?: ThemeColor;
} = {}): PartialElement {
  const { position = "top-center", color = "neutral" } = props;
  const state = toState(false);

  const isTop = position.startsWith("top");
  const isCenter = position.endsWith("center");
  const isRight = position.endsWith("right");

  const overlayEle: DomphyElement<"div"> = {
    div: [],
    id: `domphy-toast-${position}`,
    style: {
      position: "fixed",
      display: "flex",
      flexDirection: isTop ? "column" : "column-reverse",
      alignItems: isCenter ? "center" : isRight ? "end" : "start",
      inset: 0,
      gap: themeSpacing(4),
      zIndex: 30,
      padding: themeSpacing(6),
      pointerEvents: "none",
    },
  }

  return {
    _portal: (rootNode) => {
      let overlay = rootNode.domElement!.querySelector(`#domphy-toast-${position}`);
      if (!overlay) {
        const overlayNode = rootNode.children!.insert(overlayEle) as ElementNode;
        overlay = overlayNode.domElement!;
      }
      return overlay;
    },
    role: "status",
    ariaAtomic: "true",
    // Toast is rendered as an overlay surface, so it uses the inverted branch.
    dataTone: "shift-17",
    style: {
      minWidth: themeSpacing(32),
      pointerEvents: "auto",
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      boxShadow: (listener) => `0 ${themeSpacing(2)} ${themeSpacing(9)} ${themeColor(listener, "shift-4", "neutral")}`,
      opacity: (listener) => Number(state.get(listener)),
      transform: (listener) => state.get(listener) ? "translateY(0)" : isTop ? "translateY(-100%)" : "translateY(100%)",
      transition: "opacity 300ms ease, transform 300ms ease",
    },
    _onMount: () => requestAnimationFrame(() => state.set(true)),
    _onBeforeRemove: (node, done) => {
      const onEnd = (e: Event) => {
        if ((e as TransitionEvent).propertyName === "transform") {
          node.domElement!.removeEventListener("transitionend", onEnd)
          done()
        }
      }
      node.domElement!.addEventListener("transitionend", onEnd)
      state.set(false)
    }
  };
}

export { toast };
