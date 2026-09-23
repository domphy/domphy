import {
  type BehaviorInstance,
  behavior,
  type DomphyElement,
  type ElementNode,
  type PartialElement,
  toState,
} from "@domphy/core";
import {
  autoUpdate,
  computePosition,
  flip,
  inline,
  offset,
  shift,
  type VirtualElement,
} from "@domphy/floating";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import type { EditorInstance } from "../types";
import { rootOf, selectionFor } from "../utils.js";

type BubbleMenuLive = {
  editor: EditorInstance;
  shouldShow: (editor: EditorInstance) => boolean;
  children: DomphyElement;
  label: string;
};

export type BubbleMenuProps = {
  editor: EditorInstance;
  shouldShow?: (editor: EditorInstance) => boolean;
  children: DomphyElement;
  /** Accessible name for the `role="toolbar"` panel. */
  label?: string;
};

// Layered soft shadow (tight contact + broad ambient), black at low alpha so
// the same value reads on light and dark surfaces without a theme lookup —
// the same recipe as @domphy/ui's shared elevation helper, inlined because
// @domphy/ui is not a dependency of this package.
const BUBBLE_MENU_SHADOW =
  "0 2px 4px rgba(0,0,0,0.10), 0 10px 24px rgba(0,0,0,0.14)";

// Shared overlay the toolbar portals into. Never a child of the
// contenteditable host: EditorView.render() wipes that element's children
// and never reinserts the menu.
const BUBBLE_OVERLAY_ID = "domphy-editor-bubble";

const ZERO_RECT = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
};

// WAI-ARIA APG, Toolbar pattern: the toolbar is ONE tab stop, and Left/Right
// (plus Home/End) move between its controls. Everything focusable counts,
// including items already carrying tabindex="-1" from the roving itself.
const TOOLBAR_ITEMS =
  "button, [href], input, select, textarea, [tabindex], [role='button']";

/** Visible whenever the selection covers something in an editable editor. */
function defaultShouldShow(editor: EditorInstance): boolean {
  return editor.isEditable && !editor.state.selection.empty;
}

function attachBubbleMenu(
  node: ElementNode,
  initialProps: BubbleMenuLive,
): BehaviorInstance<BubbleMenuLive> {
  let { editor, shouldShow, children, label } = initialProps;
  const host = node.domElement as HTMLElement;
  const rootNode = node.getRoot();
  const visible = toState(false);
  /** Set by Escape, cleared by the next selection change. */
  let dismissed = false;

  let panelNode: ElementNode | null = null;
  let panelElement: HTMLElement | null = null;
  let stopAutoUpdate: (() => void) | null = null;

  // The last rect the selection actually had. Kept so the panel does not jump
  // to the viewport origin during the frame where the browser has dropped the
  // DOM selection but the editor has not emitted its hide event yet.
  let lastSelectionRect = ZERO_RECT;

  const currentRange = (): Range | null => {
    const selection = selectionFor(host);
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    // jsdom implements neither `Range` rect method, and floating-ui asks for
    // them from inside a promise — a consumer testing a bubble menu under
    // jsdom would get unhandled rejections instead of a menu that simply does
    // not position itself.
    if (typeof range.getBoundingClientRect !== "function") return null;
    return host.contains(range.commonAncestorContainer) ? range : null;
  };

  // A floating-ui VirtualElement over the live selection: every call re-reads
  // the range, so scrolling and window resizes reposition against the real
  // current rect rather than a snapshot taken when the menu opened.
  const selectionReference: VirtualElement = {
    contextElement: host,
    getBoundingClientRect: () => {
      const rect = currentRange()?.getBoundingClientRect();
      if (rect && (rect.width || rect.height)) lastSelectionRect = rect;
      return lastSelectionRect;
    },
    getClientRects: () => {
      const rects = currentRange()?.getClientRects();
      return rects && rects.length ? rects : [lastSelectionRect];
    },
  };

  const reposition = () => {
    if (!panelElement) return;
    computePosition(selectionReference, panelElement, {
      placement: "top",
      strategy: "fixed",
      // `inline()` picks the right rect out of a selection that wraps across
      // several lines instead of anchoring to its full bounding box.
      middleware: [inline(), offset(8), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      // Teardown can land while computePosition's async work is in flight.
      if (!panelElement) return;
      panelElement.style.left = `${x}px`;
      panelElement.style.top = `${y}px`;
    });
  };

  // Overlay parent is the app root when that root is not the contenteditable
  // host, otherwise document.body (or the hosting shadow root). Never the
  // host itself — a later EditorView.render() would wipe the toolbar.
  const overlayParent = (): ParentNode => {
    const rootElement = rootNode.domElement as HTMLElement | null;
    if (rootElement && rootElement !== host) return rootElement;
    const scope = host.getRootNode();
    return scope instanceof ShadowRoot ? scope : host.ownerDocument.body;
  };

  const ensureOverlay = (): HTMLElement => {
    const parent = overlayParent();
    const existing = parent.querySelector<HTMLElement>(`#${BUBBLE_OVERLAY_ID}`);
    if (existing) return existing;
    if (parent === rootNode.domElement) {
      const overlayNode = rootNode.children!.insert({
        div: [],
        id: BUBBLE_OVERLAY_ID,
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 20,
          pointerEvents: "none",
        },
      }) as ElementNode;
      return overlayNode.domElement as HTMLElement;
    }
    const overlay = host.ownerDocument.createElement("div");
    overlay.id = BUBBLE_OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "20";
    overlay.style.pointerEvents = "none";
    parent.appendChild(overlay);
    return overlay;
  };

  const buildPanel = (): DomphyElement<"div"> => ({
    div: [children],
    role: "toolbar",
    // `role="toolbar"` needs an accessible name (axe `aria-toolbar-name`);
    // a host that names it itself keeps its own label.
    ariaLabel: label,
    // Pressing a menu button must not move focus out of the editable area —
    // a blur would collapse the selection (and hide this menu) before the
    // button's own click handler ever runs its command.
    onMouseDown: (event) => event.preventDefault(),
    onKeyDown: onPanelKeyDown,
    onFocusOut: onPanelFocusOut,
    _portal: () => ensureOverlay(),
    style: {
      position: "fixed",
      insetBlockStart: 0,
      insetInlineStart: 0,
      zIndex: 20,
      display: "flex",
      alignItems: "center",
      gap: (listener) => themeSpacing(themeDensity(listener) * 0.5),
      padding: (listener) => themeSpacing(themeDensity(listener) * 0.5),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "text"),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong")}`,
      boxShadow: BUBBLE_MENU_SHADOW,
      visibility: (listener) => (visible.get(listener) ? "visible" : "hidden"),
      pointerEvents: (listener) => (visible.get(listener) ? "auto" : "none"),
    },
  });

  const ensureMounted = () => {
    if (panelNode) return;
    panelNode = rootNode.children!.insert(buildPanel()) as ElementNode;
    panelElement = panelNode.domElement as HTMLElement;
    // Floating content is a DOM sibling of the editor, so it sits outside the
    // editor's [data-theme] scope and would otherwise resolve theme variables
    // against the page root.
    const dataTheme = host.closest("[data-theme]")?.getAttribute("data-theme");
    if (dataTheme && !panelElement.hasAttribute("data-theme")) {
      panelElement.setAttribute("data-theme", dataTheme);
    }
  };

  const show = () => {
    ensureMounted();
    // Re-applied on every open: the toolbar's children may be reactive, and a
    // freshly rendered button is natively tabbable, which would silently add a
    // second tab stop.
    refreshRoving();
    visible.set(true);
    if (!stopAutoUpdate && panelElement) {
      stopAutoUpdate = autoUpdate(selectionReference, panelElement, reposition);
    } else {
      reposition();
    }
  };

  const hide = () => {
    visible.set(false);
    stopAutoUpdate?.();
    stopAutoUpdate = null;
  };

  const teardownPanel = () => {
    hide();
    const overlay = panelElement?.parentElement;
    panelNode?.remove();
    panelNode = null;
    panelElement = null;
    // Drop a document/shadow overlay we created; a Domphy-owned overlay
    // under the app root stays, matching the shared floating overlay.
    if (
      overlay?.id === BUBBLE_OVERLAY_ID &&
      overlay.childElementCount === 0 &&
      overlay !== rootNode.domElement
    ) {
      overlay.remove();
    }
  };

  /** Visibility for the current selection, honouring an Escape dismissal. */
  const refresh = () => {
    if (editor.isDestroyed || dismissed) return hide();
    if (shouldShow(editor)) show();
    else hide();
  };

  // A new selection (or an edit) is what clears a dismissal — not a refocus,
  // which would re-open the panel the moment Escape returns focus to the
  // editor.
  const sync = () => {
    dismissed = false;
    refresh();
  };

  const panelHas = (target: EventTarget | null | undefined): boolean =>
    target instanceof Node && panelElement !== null
      ? panelElement.contains(target)
      : false;

  /** The toolbar's focusable controls, in DOM order. */
  const toolbarItems = (): HTMLElement[] =>
    panelElement === null
      ? []
      : Array.from(
          panelElement.querySelectorAll<HTMLElement>(TOOLBAR_ITEMS),
        ).filter(
          (item) =>
            !item.hasAttribute("disabled") &&
            item.getAttribute("aria-hidden") !== "true",
        );

  // Roving tabindex: exactly one item is tabbable, so Tab enters the toolbar
  // once and Shift+Tab leaves it — the rest are reached with the arrow keys.
  const rove = (activeIndex: number) => {
    const items = toolbarItems();
    for (let index = 0; index < items.length; index += 1) {
      items[index].tabIndex = index === activeIndex ? 0 : -1;
    }
    return items;
  };

  /** Index of the item the event came from, or -1. */
  const itemIndexOf = (items: HTMLElement[], target: EventTarget | null) =>
    items.findIndex(
      (item) =>
        item === target || (target instanceof Node && item.contains(target)),
    );

  const onToolbarArrows = (event: KeyboardEvent) => {
    const items = toolbarItems();
    const current = itemIndexOf(items, event.target);
    if (current === -1) return;
    let next = current;
    switch (event.key) {
      // The toolbar is horizontal, so the arrows follow the writing direction.
      case "ArrowRight":
        next = (current + 1) % items.length;
        break;
      case "ArrowLeft":
        next = (current - 1 + items.length) % items.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = items.length - 1;
        break;
      default:
        return;
    }
    // Arrows would otherwise scroll the page or move the caret in the editor.
    event.preventDefault();
    rove(next)[next]?.focus();
  };

  /** Keep the tab stop on whatever currently has focus, else the first item. */
  const refreshRoving = () => {
    const items = toolbarItems();
    if (items.length === 0) return;
    const focused = itemIndexOf(items, rootOf(host).activeElement);
    rove(focused === -1 ? 0 : focused);
  };

  // Escape dismisses the overlay (WAI-ARIA APG: every non-modal overlay must
  // be dismissible from the keyboard) and, when the keypress came from inside
  // the toolbar, hands focus back to the text. The next selection change
  // brings the panel back.
  const dismissOnEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || dismissed || !visible.get()) return;
    // This overlay consumes the key: a dialog wrapping the editor must not
    // close as well.
    event.stopPropagation();
    const fromPanel = panelHas(event.target);
    dismissed = true;
    hide();
    if (fromPanel) editor.commands.focus();
  };
  host.addEventListener("keydown", dismissOnEscape);

  const onPanelKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      dismissOnEscape(event);
      return;
    }
    onToolbarArrows(event);
  };

  // Tabbing out of the toolbar to something that is neither the toolbar nor
  // the editor ends the interaction — the editor's own blur already fired
  // when focus first entered the toolbar, so nothing else would close it.
  const onPanelFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (panelHas(next) || (next instanceof Node && host.contains(next))) return;
    hide();
  };

  // tiptap's `BubbleMenuPlugin.blurHandler`: a blur whose `relatedTarget` is
  // inside the menu is focus ARRIVING in the menu, not a dismissal. Without
  // this the panel is hidden mid-Tab, the browser finds nothing focusable
  // where it was about to land, and focus falls to <body> — the toolbar is
  // unreachable by keyboard.
  const onEditorBlur = (event: unknown) => {
    if (panelHas((event as FocusEvent | undefined)?.relatedTarget)) return;
    hide();
  };

  // Wired inside attach(), not from a bare _onMount closure: the patch factory
  // re-runs on every re-render of the host and would otherwise leave listeners
  // bound to an orphaned generation's editor reference.
  const bind = (target: EditorInstance) => {
    target.on("selectionUpdate", sync);
    target.on("update", sync);
    target.on("focus", refresh);
    target.on("blur", onEditorBlur);
    target.on("destroy", teardownPanel);
  };
  const unbind = (target: EditorInstance) => {
    target.off("selectionUpdate", sync);
    target.off("update", sync);
    target.off("focus", refresh);
    target.off("blur", onEditorBlur);
    target.off("destroy", teardownPanel);
  };

  bind(editor);

  return {
    update(props) {
      if (props.editor !== editor) {
        unbind(editor);
        editor = props.editor;
        bind(editor);
      }
      shouldShow = props.shouldShow;
      if (props.children !== children || props.label !== label) {
        children = props.children;
        label = props.label;
        // Patch the already-inserted panel in place (same DOM node, no
        // teardown) rather than re-inserting it — the ordinary reused-node
        // contract, applied to the imperatively-inserted panel too.
        panelNode?.patch(buildPanel());
        refreshRoving();
      }
      sync();
    },
    destroy() {
      host.removeEventListener("keydown", dismissOnEscape);
      unbind(editor);
      teardownPanel();
    },
  };
}

/**
 * Floating menu anchored to the current text selection.
 *
 * Apply it to the same host element as {@link editorContent}. The menu is
 * portaled into a document/root overlay (never inside the contenteditable
 * host — `EditorView.render()` wipes that element's children), positioned
 * with `@domphy/floating` against a virtual element that tracks the live
 * selection rect, and shown whenever `shouldShow` passes. Destroying the
 * editor hides and removes the toolbar.
 *
 * @hostTag div
 * @param editor - The editor whose selection anchors the menu.
 * @param props.children - The menu content (compose buttons from `@domphy/ui`).
 * @param props.shouldShow - Predicate deciding visibility on every selection change. Optional. Defaults to "editable, with a non-empty selection".
 * @param props.label - Accessible name for the `role="toolbar"` panel. Optional. Defaults to `"Formatting"`.
 * @example { div: null, $: [editorContent(editor), bubbleMenu(editor, { children: { div: [...] } })] }
 */
function bubbleMenu(
  editor: EditorInstance,
  props: {
    children: DomphyElement;
    shouldShow?: (editor: EditorInstance) => boolean;
    label?: string;
  },
): PartialElement {
  return behavior<BubbleMenuLive>("dp-editor-bubble-menu", attachBubbleMenu, {
    editor,
    children: props.children,
    shouldShow: props.shouldShow ?? defaultShouldShow,
    label: props.label ?? "Formatting",
  });
}

export { bubbleMenu };
