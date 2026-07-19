import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { lockScroll, unlockScroll } from "../utils/scrollLock.js";

type PhysicalPlacement = "left" | "right" | "top" | "bottom";
type Placement = PhysicalPlacement | "start" | "end";

const translateOut: Record<PhysicalPlacement, string> = {
  left: "translateX(-100%)",
  right: "translateX(100%)",
  top: "translateY(-100%)",
  bottom: "translateY(100%)",
};

const marginMap: Record<PhysicalPlacement, string> = {
  left: "0 auto 0 0",
  right: "0 0 0 auto",
  top: "0 0 auto 0",
  bottom: "auto 0 0 0",
};

const isVertical = (p: PhysicalPlacement) => p === "left" || p === "right";

function resolvePhysical(
  placement: Placement,
  isRTL: boolean,
): PhysicalPlacement {
  if (placement === "start") return isRTL ? "right" : "left";
  if (placement === "end") return isRTL ? "left" : "right";
  return placement;
}

/**
 * Edge-anchored modal drawer driven by an `open` State. Slides in/out from a
 * chosen edge via a 250 ms transform transition, calls `showModal()`/`close()`,
 * locks page scroll while open, and closes on backdrop click. A 350 ms fallback
 * ensures `close()` is always called even when `transitionend` doesn't fire
 * (reduced-motion, `display:none`, detached element). Apply to a `<dialog>`.
 *
 * Because the patch uses the native `<dialog>` `showModal()` API, the browser
 * traps focus inside the drawer while it is open and restores focus to the
 * previously focused element when `close()` is called. Sets `aria-modal="true"`.
 * Escape key closes the drawer via the animated state path (not immediate close).
 *
 * `"start"` and `"end"` placements resolve to left/right based on the
 * document's `dir` attribute at mount time, enabling RTL-aware drawers:
 * `"start"` → left (LTR) / right (RTL); `"end"` → right (LTR) / left (RTL).
 *
 * @hostTag dialog
 * @param props.color - Theme color tone for the drawer surface. Defaults to "neutral".
 * @param props.open - Open state (`ValueOrState<boolean>`); set true/false to show/hide. Defaults to false.
 * @param props.placement - Edge to anchor to. "left" | "right" | "top" | "bottom" | "start" | "end". Defaults to "end".
 * @param props.size - CSS length for the drawer's width (left/right/start/end) or height (top/bottom). Defaults to themeSpacing(80) for left/right, themeSpacing(64) for top/bottom.
 * @example { dialog: [...], $: [drawer({ open, placement: "start" })] }
 */
function drawer(
  props: {
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    placement?: Placement;
    size?: string;
  } = {},
): PartialElement {
  const { color = "neutral", open = false, placement = "end", size } = props;
  const state = toState(open);
  const isLogical = placement === "start" || placement === "end";

  // For static rendering / SSR assume LTR as fallback; corrected at mount time.
  const physicalFallback = resolvePhysical(placement, false);
  const defaultSize = isVertical(physicalFallback)
    ? themeSpacing(80)
    : themeSpacing(64);
  const drawerSize = size ?? defaultSize;

  return {
    _onInsert: (node) => {
      if (node.tagName !== "dialog") {
        console.warn(`"drawer" patch must use dialog tag`);
      }
    },
    onClick: (e: MouseEvent, node) => {
      if (e.target !== node.domElement) return;
      state.set(false);
    },
    _onMount: (node) => {
      const dlg = node.domElement as HTMLDialogElement;
      dlg.setAttribute("aria-modal", "true");

      const onCancel = (e: Event) => {
        e.preventDefault();
        state.set(false);
      };
      dlg.addEventListener("cancel", onCancel);

      // Resolve logical placements at mount time using document direction.
      const isRTL =
        isLogical &&
        (dlg.ownerDocument.documentElement.dir === "rtl" ||
          dlg.ownerDocument.dir === "rtl");
      const physical = resolvePhysical(placement, isRTL);

      // Correct initial styles for logical placements whose physical direction
      // may differ from the LTR fallback used in the static style block.
      if (isLogical) {
        dlg.style.transform = translateOut[physical];
        dlg.style.margin = marginMap[physical];
        dlg.style.width = isVertical(physical) ? drawerSize : "100dvw";
        dlg.style.height = isVertical(physical) ? "100dvh" : drawerSize;
      }

      let closing = false;
      let scrollLocked = false;
      let closeTimer: ReturnType<typeof setTimeout> | null = null;
      const finishClose = () => {
        closeTimer = null;
        if (!closing) return;
        closing = false;
        // Guard for environments with HTMLDialogElement but no close()
        // implementation (e.g. jsdom in tests).
        if (typeof dlg.close === "function") dlg.close();
        // Same fix as dialog.ts: the closed state was only ever represented
        // by an off-screen `transform`, never visibility/pointer-events — a
        // closed drawer stayed fully reachable by Tab and exposed to the
        // accessibility tree (a CSS transform, like opacity, does neither),
        // and a consumer's own `style: { display: ... }` overrides the UA
        // stylesheet's `dialog:not([open])` rule anyway. Set INLINE so it
        // always wins.
        dlg.style.visibility = "hidden";
        dlg.style.pointerEvents = "none";
        if (scrollLocked) {
          unlockScroll();
          scrollLocked = false;
        }
      };

      const onTransitionEnd = (e: Event) => {
        if (e.target !== dlg) return;
        if ((e as TransitionEvent).propertyName !== "transform") return;
        finishClose();
      };
      dlg.addEventListener("transitionend", onTransitionEnd);

      const update = (val: boolean) => {
        if (val) {
          closing = false;
          dlg.style.visibility = "visible";
          dlg.style.pointerEvents = "auto";
          // Guard for environments with HTMLDialogElement but no showModal()
          // implementation (e.g. jsdom in tests).
          if (typeof dlg.showModal === "function") dlg.showModal();
          if (!scrollLocked) {
            lockScroll();
            scrollLocked = true;
          }
          requestAnimationFrame(() => {
            dlg.style.transform = "translate(0, 0)";
          });
        } else {
          closing = true;
          dlg.style.transform = translateOut[physical];
          closeTimer = setTimeout(finishClose, 350);
        }
      };
      update(state.get());
      const release = state.addListener(update);
      node.addHook("Remove", () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
          closeTimer = null;
        }
        release();
        dlg.removeEventListener("cancel", onCancel);
        dlg.removeEventListener("transitionend", onTransitionEnd);
        if (scrollLocked) {
          unlockScroll();
          scrollLocked = false;
        }
      });
    },
    style: {
      transform: translateOut[physicalFallback],
      // Matches finishClose's inline defaults — a drawer that mounts
      // already-closed (the common case) must start out of the tab
      // order/accessibility tree from first paint, not just after its first
      // open->close cycle runs finishClose.
      visibility: "hidden",
      pointerEvents: "none",
      transition: "transform 0.25s ease",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-10", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      padding: (listener) => themeSpacing(themeDensity(listener) * 3),
      margin: marginMap[physicalFallback],
      width: isVertical(physicalFallback) ? drawerSize : "100dvw",
      height: isVertical(physicalFallback) ? "100dvh" : drawerSize,
      maxWidth: "100dvw",
      maxHeight: "100dvh",
      boxShadow: elevation("high"),
      "&::backdrop": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        opacity: 0.75,
      },
    },
  };
}

export { drawer };
