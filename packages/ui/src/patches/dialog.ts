import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { lockScroll, unlockScroll } from "../utils/scrollLock.js";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), details, [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog patch driven by an `open` State. Calls `showModal()`/`close()`,
 * fades via opacity, locks page scroll while open, traps Tab focus within the
 * dialog, restores focus to the previously focused element on close, sets
 * `aria-modal`, and closes on outside (backdrop) click. Apply to a `<dialog>`.
 *
 * @hostTag dialog
 * @param props.color - Theme color tone for the dialog surface. Defaults to "neutral".
 * @param props.open - Open state (`ValueOrState<boolean>`); set it to true/false to show/hide. Defaults to false.
 * @example { dialog: [...], $: [dialog({ open })] }
 */
function dialog(
  props: { color?: ThemeColor; open?: ValueOrState<boolean> } = {},
): PartialElement {
  const { color = "neutral", open = false } = props;
  const state = toState(open);
  let previousFocus: HTMLElement | null = null;
  let closing = false;
  let scrollLocked = false;

  const finalizeClose = (dlg: HTMLDialogElement) => {
    closing = false;
    dlg.close();
    if (scrollLocked) {
      unlockScroll();
      scrollLocked = false;
    }
    previousFocus?.focus();
    previousFocus = null;
  };

  return {
    _onInsert: (node) => {
      if (node.tagName !== "dialog") {
        console.warn(`"dialog" primitive patch must use dialog tag`);
      }
    },
    onClick: (e: MouseEvent, node) => {
      if (e.target !== node.domElement) return;
      const r = node.domElement!.getBoundingClientRect();
      const inside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      if (!inside) state.set(false);
    },
    onTransitionEnd: (e, node) => {
      if (!closing) return;
      // Guard against bubbled transitionend from nested content (e.g. an
      // accordion/details transition inside the dialog) prematurely
      // triggering close-finalization.
      if (e.target !== node.domElement) return;
      if (e.propertyName !== "opacity") return;
      finalizeClose(node.domElement as HTMLDialogElement);
    },
    _onMount: (node) => {
      const dlg = node.domElement as HTMLDialogElement;
      dlg.setAttribute("aria-modal", "true");
      let closeTimer: ReturnType<typeof setTimeout> | null = null;

      const trapFocus = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const focusables = Array.from(
          dlg.querySelectorAll<HTMLElement>(FOCUSABLE),
        ).filter(
          (el) =>
            !el.closest("[aria-hidden='true']") && el.offsetParent !== null,
        );
        if (!focusables.length) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === dlg
          ) {
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
          previousFocus = document.activeElement as HTMLElement;
          dlg.showModal();
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
            finalizeClose(dlg);
          }, 350);
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
        if (scrollLocked) {
          unlockScroll();
          scrollLocked = false;
        }
        dlg.removeEventListener("keydown", trapFocus);
        previousFocus?.focus();
        previousFocus = null;
      });
    },
    style: {
      opacity: "0",
      transition: "opacity 200ms ease",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-10", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      border: "none",
      padding: (listener) => themeSpacing(themeDensity(listener) * 3),
      boxShadow: (listener) =>
        `0 ${themeSpacing(9)} ${themeSpacing(16)} ${themeColor(listener, "shift-4", "neutral")}`,
      "&::backdrop": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-2", "neutral"),
        opacity: 0.75,
      },
    },
  };
}

export { dialog };
