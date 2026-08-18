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
import { selectionFor } from "../utils.js";

type BubbleMenuProps = {
  editor: EditorInstance;
  shouldShow: (editor: EditorInstance) => boolean;
  children: DomphyElement;
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

/** Visible whenever the selection covers something in an editable editor. */
function defaultShouldShow(editor: EditorInstance): boolean {
  return editor.isEditable && !editor.state.selection.empty;
}

function attachBubbleMenu(
  node: ElementNode,
  initialProps: BubbleMenuProps,
): BehaviorInstance<BubbleMenuProps> {
  let { editor, shouldShow, children } = initialProps;
  const host = node.domElement as HTMLElement;
  const rootNode = node.getRoot();
  const visible = toState(false);

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
    // Pressing a menu button must not move focus out of the editable area —
    // a blur would collapse the selection (and hide this menu) before the
    // button's own click handler ever runs its command.
    onMouseDown: (event) => event.preventDefault(),
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

  const sync = () => {
    if (editor.isDestroyed) return hide();
    if (shouldShow(editor)) show();
    else hide();
  };

  // Wired inside attach(), not from a bare _onMount closure: the patch factory
  // re-runs on every re-render of the host and would otherwise leave listeners
  // bound to an orphaned generation's editor reference.
  const bind = (target: EditorInstance) => {
    target.on("selectionUpdate", sync);
    target.on("update", sync);
    target.on("focus", sync);
    target.on("blur", hide);
    target.on("destroy", teardownPanel);
  };
  const unbind = (target: EditorInstance) => {
    target.off("selectionUpdate", sync);
    target.off("update", sync);
    target.off("focus", sync);
    target.off("blur", hide);
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
      if (props.children !== children) {
        children = props.children;
        // Patch the already-inserted panel in place (same DOM node, no
        // teardown) rather than re-inserting it — the ordinary reused-node
        // contract, applied to the imperatively-inserted panel too.
        panelNode?.patch(buildPanel());
      }
      sync();
    },
    destroy() {
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
 * @example { div: null, $: [editorContent(editor), bubbleMenu(editor, { children: { div: [...] } })] }
 */
function bubbleMenu(
  editor: EditorInstance,
  props: {
    children: DomphyElement;
    shouldShow?: (editor: EditorInstance) => boolean;
  },
): PartialElement {
  return behavior<BubbleMenuProps>("dp-editor-bubble-menu", attachBubbleMenu, {
    editor,
    children: props.children,
    shouldShow: props.shouldShow ?? defaultShouldShow,
  });
}

export { bubbleMenu };
export type { BubbleMenuProps };
