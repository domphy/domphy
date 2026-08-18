import {
  type BehaviorInstance,
  behavior,
  type ElementNode,
  type PartialElement,
  type State,
  toState,
  type ValueOrState,
} from "@domphy/core";
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

type DrawerProps = {
  state: State<boolean>;
  placement: Placement;
  size?: string;
};

type DrawerInstance = BehaviorInstance<DrawerProps> & {
  requestClose: () => void;
};

function attachDrawer(
  node: ElementNode,
  initialProps: DrawerProps,
): DrawerInstance {
  let { state, placement, size } = initialProps;

  const dlg = node.domElement as HTMLDialogElement;
  dlg.setAttribute("aria-modal", "true");

  const onCancel = (e: Event) => {
    e.preventDefault();
    state.set(false);
  };
  dlg.addEventListener("cancel", onCancel);

  const resolve = (nextPlacement: Placement, nextSize?: string) => {
    const isLogical = nextPlacement === "start" || nextPlacement === "end";
    const isRTL =
      isLogical &&
      (dlg.ownerDocument.documentElement.dir === "rtl" ||
        dlg.ownerDocument.dir === "rtl");
    const physical = resolvePhysical(nextPlacement, isRTL);
    const drawerSize =
      nextSize ??
      (isVertical(physical) ? themeSpacing(80) : themeSpacing(64));
    dlg.style.margin = marginMap[physical];
    dlg.style.width = isVertical(physical) ? drawerSize : "100dvw";
    dlg.style.height = isVertical(physical) ? "100dvh" : drawerSize;
    return physical;
  };

  let physical = resolve(placement, size);

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
      // Cancel any in-flight close: a pending fallback timer or a leftover
      // `closing` flag would otherwise finalize-close the just-opened drawer
      // when the open slide's own transitionend (or the 350ms timer) fires.
      closing = false;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      dlg.style.visibility = "visible";
      dlg.style.pointerEvents = "auto";
      // Guard for environments with HTMLDialogElement but no showModal()
      // implementation (e.g. jsdom in tests). Also guard against re-entering
      // on an already-open dialog — showModal() throws InvalidStateError in
      // real browsers when the dialog is already open.
      if (typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
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
  let release = state.addListener(update);

  return {
    requestClose: () => state.set(false),
    update(props) {
      if (props.state !== state) {
        release();
        state = props.state;
        release = state.addListener(update);
      }
      if (props.placement !== placement || props.size !== size) {
        placement = props.placement;
        size = props.size;
        physical = resolve(placement, size);
        if (!state.get()) dlg.style.transform = translateOut[physical];
      }
    },
    destroy() {
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
    },
  };
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
    ...behavior<DrawerProps>("drawer", attachDrawer, { state, placement, size }),
    onClick: (e: MouseEvent, node) => {
      if (e.target !== node.domElement) return;
      const r = node.domElement!.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) node.getBehavior<DrawerInstance>("drawer")?.requestClose();
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
