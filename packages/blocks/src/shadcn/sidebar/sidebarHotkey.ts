// Shared Ctrl/Cmd+B sidebar-toggle hotkey, declared as a behavior() so it
// survives the reused-node lifecycle: `attach` runs ONCE for the real DOM
// node no matter how many times a reactive ancestor re-invokes the block
// factory, and every later generation's fresh `onToggle` closure is routed
// into `update()`. The previous `_onMount` + closure listener kept calling
// generation 1's disconnected state after any ancestor re-render, so the
// hotkey silently went dead (see AGENTS.md "Reused-node lifecycle").

import type { ElementNode, PartialElement } from "@domphy/core";
import { behavior } from "@domphy/core";

type SidebarHotkeyProps = {
  onToggle: () => void;
};

function attachSidebarHotkey(
  _node: ElementNode,
  initialProps: SidebarHotkeyProps,
) {
  let onToggle = initialProps.onToggle;
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      onToggle();
    }
  };
  window.addEventListener("keydown", handleKeydown);
  return {
    update: (next: SidebarHotkeyProps) => {
      onToggle = next.onToggle;
    },
    destroy: () => window.removeEventListener("keydown", handleKeydown),
  };
}

/** Ctrl/Cmd+B toggles the sidebar — the shadcn/ui sidebar keyboard shortcut. */
export function sidebarHotkey(onToggle: () => void): PartialElement {
  return behavior<SidebarHotkeyProps>("sidebar-hotkey", attachSidebarHotkey, {
    onToggle,
  });
}

type SidebarEscapeProps = {
  onClose: () => void;
};

function attachSidebarEscape(
  node: ElementNode,
  initialProps: SidebarEscapeProps,
) {
  let onClose = initialProps.onClose;
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    // Only when this host (the drawer backdrop) is actually on screen: it is
    // `display: none` above the mobile breakpoint, where Escape must not
    // collapse the desktop sidebar.
    const element = node.domElement as HTMLElement | undefined;
    if (!element || getComputedStyle(element).display === "none") return;
    onClose();
  };
  window.addEventListener("keydown", handleKeydown);
  return {
    update: (next: SidebarEscapeProps) => {
      onClose = next.onClose;
    },
    destroy: () => window.removeEventListener("keydown", handleKeydown),
  };
}

/**
 * Escape closes the open mobile drawer. Upstream renders the mobile sidebar in
 * a Radix `Sheet` (a modal dialog), whose Escape dismissal is part of the
 * WAI-ARIA APG dialog pattern; the hand-rolled off-canvas panels here had no
 * key handler at all, so Escape left the drawer and its backdrop on screen.
 * `behavior()` for the same reason as `sidebarHotkey` above.
 */
export function sidebarEscape(onClose: () => void): PartialElement {
  return behavior<SidebarEscapeProps>("sidebar-escape", attachSidebarEscape, {
    onClose,
  });
}
