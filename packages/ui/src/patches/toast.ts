import type {
  DomphyElement,
  ElementNode,
  PartialElement,
  State,
} from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";

type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

// The open state must live on the NODE, not in the factory closure: a toast
// inside a reactive parent gets a fresh toast() closure per ancestor
// re-render (fresh `toState(false)`), while `_onMount` (which flips the state
// to visible via rAF) runs ONCE for the first generation. The reused node's
// re-patched style bindings would read the new generation's still-false
// state and snap the visible toast back to opacity 0 / translated out.
// Resolving through node metadata gives every generation the SAME state.
function resolveOpenState(node: ElementNode): State<boolean> {
  let state = node.getMetadata("toastOpen") as State<boolean> | undefined;
  if (!state) {
    state = toState(false);
    node.setMetadata("toastOpen", state);
  }
  return state;
}

const readOpen = (listener: any): boolean => {
  const node = listener?.elementNode as ElementNode | undefined;
  return node ? resolveOpenState(node).get(listener) : false;
};

/**
 * Renders a transient notification surface as a fixed-position overlay (portaled
 * into a corner stack), animating in on mount and out before removal. No host
 * tag check; typically applied to a `<div>`.
 *
 * @param props.position - Corner of the screen for the toast stack. Optional, one of `"top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"`. Defaults to `"top-center"`.
 * @param props.color - Theme color for the toast surface. Optional. Defaults to `"neutral"`.
 * @example { div: "Saved!", $: [toast({ position: "top-right" })] }
 */
function toast(
  props: { position?: ToastPosition; color?: ThemeColor } = {},
): PartialElement {
  const { position = "top-center", color = "neutral" } = props;

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
  };

  return {
    _portal: (rootNode) => {
      let overlay = rootNode.domElement!.querySelector(
        `#domphy-toast-${position}`,
      );
      if (!overlay) {
        const overlayNode = rootNode.children!.insert(
          overlayEle,
        ) as ElementNode;
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
      color: (listener) => themeColor(listener, "text", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      boxShadow: elevation("medium"),
      opacity: (listener) => Number(readOpen(listener)),
      transform: (listener) =>
        readOpen(listener)
          ? "translateY(0)"
          : isTop
            ? "translateY(-100%)"
            : "translateY(100%)",
      transition: "opacity 300ms ease, transform 300ms ease",
    },
    _onMount: (node) =>
      requestAnimationFrame(() => resolveOpenState(node).set(true)),
    _onBeforeRemove: (node, done) => {
      let finished = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let overlayRemoved = false;
      const rootNode = node.getRoot();
      const overlayEl = node.domElement?.parentElement ?? null;
      // The #domphy-toast-{position} overlay is inserted into the root on
      // first use and shared by every toast at that position — remove it once
      // its LAST toast is gone instead of leaking one empty fixed container
      // per used position for the app's whole lifetime.
      const removeOverlayIfEmpty = () => {
        if (overlayRemoved) return;
        if (
          !overlayEl ||
          overlayEl.id !== `domphy-toast-${position}` ||
          overlayEl.childElementCount > 0
        ) {
          return;
        }
        overlayRemoved = true;
        const item = rootNode.children?.items.find(
          (it) => (it as ElementNode).domElement === overlayEl,
        );
        if (item) rootNode.children!.remove(item);
        else overlayEl.remove();
      };
      const finish = () => {
        if (finished) return;
        finished = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        node.domElement!.removeEventListener("transitionend", onEnd);
        done();
        removeOverlayIfEmpty();
      };
      const onEnd = (e: Event) => {
        if ((e as TransitionEvent).propertyName === "transform") finish();
      };
      node.domElement!.addEventListener("transitionend", onEnd);
      // Fallback: if transitionend never fires (reduced-motion, display:none,
      // early detach), unblock removal after the transition duration + buffer.
      timer = setTimeout(finish, 350);
      // If the node is detached before the exit animation settles, clear the
      // pending fallback timer and the transitionend listener so they cannot
      // fire on a removed node.
      node.addHook("Remove", () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        node.domElement?.removeEventListener("transitionend", onEnd);
        removeOverlayIfEmpty();
      });
      resolveOpenState(node).set(false);
    },
  };
}

export { toast };
