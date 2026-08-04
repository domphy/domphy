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

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), details, [tabindex]:not([tabindex="-1"])';

type DialogProps = {
  state: State<boolean>;
};

type DialogInstance = BehaviorInstance<DialogProps> & {
  // Close via the instance's CURRENT state — routing through the behavior
  // guarantees the state being set is the one the open/close subscription
  // listens to, even when a re-rendered generation's closure would otherwise
  // set its own fresh (unsubscribed) default state.
  requestClose: () => void;
  onTransitionEnd: (e: Event) => void;
};

// All close-finalization state (closing flag, previousFocus, scrollLocked,
// the fallback timer) lives in ONE behavior instance per dialog node. It used
// to be factory-scope variables captured by _onMount — but _onMount runs once
// for the FIRST generation only, while onTransitionEnd (live-rebound every
// patch) belongs to the LATEST generation: gen-1's update() set gen-1's
// `closing = true` and the live gen-N handler read gen-N's `closing` (false)
// and early-returned, so every close fell back to the 350ms timer and focus
// restore scrolled through stale closures. behavior() attaches once and
// routes every later generation's props into the same instance (floating.ts
// pattern).
function attachDialog(
  node: ElementNode,
  initialProps: DialogProps,
): DialogInstance {
  let { state } = initialProps;
  let previousFocus: HTMLElement | null = null;
  let closing = false;
  let scrollLocked = false;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const dlg = node.domElement as HTMLDialogElement;
  dlg.setAttribute("aria-modal", "true");

  const finalizeClose = () => {
    closing = false;
    // Guard for environments with HTMLDialogElement but no close()
    // implementation (e.g. jsdom in tests).
    if (typeof dlg.close === "function") dlg.close();
    // visibility/pointer-events (not just opacity) must reflect the closed
    // state: opacity alone leaves a closed dialog's content fully reachable
    // by Tab and exposed to the accessibility tree (opacity, unlike
    // visibility, never removes an element from either) — and a consumer
    // that sets its own `style: { display: ... }` on the dialog (a common
    // pattern for centering content) overrides the UA stylesheet's
    // `dialog:not([open]) { display: none }`, so `dlg.close()` alone doesn't
    // reliably hide it either. Set INLINE so it always wins regardless of
    // what the consumer's own style object declares.
    dlg.style.visibility = "hidden";
    dlg.style.pointerEvents = "none";
    if (scrollLocked) {
      unlockScroll();
      scrollLocked = false;
    }
    previousFocus?.focus();
    previousFocus = null;
  };

  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusables = Array.from(
      dlg.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter(
      (el) => !el.closest("[aria-hidden='true']") && el.offsetParent !== null,
    );
    if (!focusables.length) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === dlg) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onCancel = (e: Event) => {
    e.preventDefault();
    state.set(false);
  };
  dlg.addEventListener("cancel", onCancel);

  const update = (val: boolean) => {
    if (val) {
      // Cancel any in-flight close: a pending fallback timer or a true
      // `closing` flag left over from the previous close (e.g. reopening
      // within the 350ms window, or the mount-time close of an
      // initially-closed dialog) would otherwise finalize-close the
      // just-opened dialog on the open fade's own transitionend.
      closing = false;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      previousFocus = document.activeElement as HTMLElement;
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
      dlg.addEventListener("keydown", trapFocus);
      requestAnimationFrame(() => {
        dlg.style.opacity = "1";
        const focusable = dlg.querySelector<HTMLElement>(FOCUSABLE);
        focusable?.focus();
      });
    } else {
      closing = true;
      dlg.style.opacity = "0";
      dlg.removeEventListener("keydown", trapFocus);
      // Fallback: if transitionend never fires (reduced-motion, display:none),
      // unblock close after the transition duration + buffer.
      closeTimer = setTimeout(() => {
        closeTimer = null;
        if (!closing) return;
        finalizeClose();
      }, 350);
    }
  };
  update(state.get());
  let release = state.addListener(update);

  return {
    requestClose: () => state.set(false),
    onTransitionEnd: (e: Event) => {
      if (!closing) return;
      // Guard against bubbled transitionend from nested content (e.g. an
      // accordion/details transition inside the dialog) prematurely
      // triggering close-finalization.
      if (e.target !== dlg) return;
      if ((e as TransitionEvent).propertyName !== "opacity") return;
      finalizeClose();
    },
    update(props) {
      // Re-subscribe when a later generation brings a genuinely different
      // state object (e.g. the default `toState(false)` allocated per
      // factory call); a caller-owned state arrives as the SAME object and
      // keeps its existing subscription untouched.
      if (props.state !== state) {
        release();
        state = props.state;
        release = state.addListener(update);
      }
    },
    destroy() {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      release();
      dlg.removeEventListener("cancel", onCancel);
      if (scrollLocked) {
        unlockScroll();
        scrollLocked = false;
      }
      dlg.removeEventListener("keydown", trapFocus);
      previousFocus?.focus();
      previousFocus = null;
    },
  };
}

/**
 * Modal dialog patch driven by an `open` State. Calls `showModal()`/`close()`,
 * fades via opacity, locks page scroll while open, traps Tab focus within the
 * dialog, restores focus to the previously focused element on close, sets
 * `aria-modal`, and closes on outside (backdrop) click. Apply to a `<dialog>`.
 *
 * Accessible name/description: pass `labelledBy`/`describedBy` the `id` of a
 * heading/paragraph inside the dialog (Radix Title/Description parity). The
 * native `ariaLabelledby`/`ariaDescribedby` attributes on the host element
 * remain an equivalent escape hatch (the native element always wins).
 *
 * @hostTag dialog
 * @param props.color - Theme color tone for the dialog surface. Defaults to "neutral".
 * @param props.open - Open state (`ValueOrState<boolean>`); set it to true/false to show/hide. Defaults to false.
 * @param props.labelledBy - `id` of the element labeling the dialog (wired to `aria-labelledby`). Optional.
 * @param props.describedBy - `id` of the element describing the dialog (wired to `aria-describedby`). Optional.
 * @example { dialog: [{ h2: "Confirm", id: "dlg-title" }], $: [dialog({ open, labelledBy: "dlg-title" })] }
 */
function dialog(
  props: {
    color?: ThemeColor;
    open?: ValueOrState<boolean>;
    labelledBy?: string;
    describedBy?: string;
  } = {},
): PartialElement {
  const { color = "neutral", open = false, labelledBy, describedBy } = props;
  const state = toState(open);

  return {
    _onInsert: (node) => {
      if (node.tagName !== "dialog") {
        console.warn(`"dialog" primitive patch must use dialog tag`);
      }
    },
    ...behavior<DialogProps>("dialog", attachDialog, { state }),
    ariaLabelledby: labelledBy,
    ariaDescribedby: describedBy,
    onClick: (e: MouseEvent, node) => {
      if (e.target !== node.domElement) return;
      const r = node.domElement!.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) node.getBehavior<DialogInstance>("dialog")?.requestClose();
    },
    onTransitionEnd: (e, node) =>
      node.getBehavior<DialogInstance>("dialog")?.onTransitionEnd(e),
    style: {
      opacity: "0",
      // Matches finalizeClose's inline defaults — a dialog that mounts
      // already-closed (the common case: `open` defaults to false) must
      // start out of the tab order/accessibility tree from first paint, not
      // just after its first open->close cycle runs finalizeClose.
      visibility: "hidden",
      pointerEvents: "none",
      transition: "opacity 200ms ease",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-10", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
      padding: (listener) => themeSpacing(themeDensity(listener) * 3),
      boxShadow: elevation("high"),
      "&::backdrop": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        opacity: 0.75,
      },
    },
  };
}

export { dialog };
