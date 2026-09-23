import {
  type BehaviorInstance,
  behavior,
  type DomphyElement,
  type ElementNode,
  merge,
  type PartialElement,
  type ReadableState,
  type State,
  type ValueOrState,
} from "@domphy/core";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  shift,
} from "@domphy/floating";
import {
  asOpenState,
  dismissOpen,
  subscribeOpen,
  writeOpen,
} from "./openState.js";

type FloatingProps = {
  kind: string;
  openState: ReadableState<boolean>;
  // Lives on the behavior instance so a reused node gets the latest callback
  // via update() — do not close over factory-generation onDismiss.
  onDismiss?: () => void;
  placement: State<Placement>;
  content: DomphyElement;
  // popover's openOn === "hover" case: hovering the floating PANEL itself
  // (not just the anchor) must keep it open, so the pointer can travel from
  // trigger to panel without the debounced hide() firing first.
  keepOpenOnContentHover: boolean;
  // Hover-intent debounce, in ms. Configurable per consumer (Radix Tooltip
  // parity: `delayDuration`) instead of the single fixed value every floating
  // consumer used to share.
  openDelay: number;
  closeDelay: number;
};

// The previous fixed debounce, kept as the default when a consumer does not
// pass its own delay — INHERITED from the pre-existing behavior this file
// hard-coded before openDelay/closeDelay became configurable.
const FLOATING_DEFAULT_DELAY_MS = 100;

// The panel id every floating component gets, derived deterministically from
// the ANCHOR's nodeId (stable across generations — a reused node keeps its
// nodeId — and across SSR/hydration, unlike Math.random()). The anchor's
// trigger partial references the same id via _onSchedule (aria-controls /
// aria-describedby), so trigger and panel agree without any factory-scope
// mutable variable that a fresh generation would lose.
function floatingPanelId(kind: string, node: ElementNode): string {
  return `domphy-${kind}-${node.nodeId}`;
}

// The overlay container every floating panel portals into. Marked with a data
// ATTRIBUTE, not an id: there is one container per app root and one more per
// open <dialog>, so a document can legitimately hold several at once and a
// fixed `id="domphy-floating"` made every one after the first a duplicate id —
// invalid HTML, and `document.getElementById`/`querySelector("#…")` silently
// resolved to whichever happened to come first in document order. Every lookup
// below is `:scope >` scoped to one parent anyway, so uniqueness was never
// what the selector needed.
const OVERLAY_ATTRIBUTE = "data-domphy-floating";
const OVERLAY_SELECTOR = `:scope > [${OVERLAY_ATTRIBUTE}]`;
// Stamped on every floating panel element with its `kind` ("tooltip",
// "popover", "menu", ...) so hasOpenFloatingPanel can tell a hover tooltip
// apart from a layer the user is actually inside.
const OVERLAY_KIND_ATTRIBUTE = "data-domphy-floating-kind";

/**
 * True while a popover/select/datePicker panel is mounted inside this
 * `<dialog>` (they portal into the dialog's own overlay container, see
 * `_portal`). A hover-only tooltip does NOT count: Radix's DismissableLayer
 * and React Aria's overlay stack both treat a hover tooltip as decoration,
 * not a layer the user is "inside" — it never consumes a Dismiss keypress.
 * Before this exclusion, a tooltip left open by a lingering hover cost the
 * dialog's Escape an extra press before it closed.
 *
 * Escape must dismiss only the TOP layer — Radix's DismissableLayer and React
 * Aria's overlay stack both stop at the innermost open layer. The browser
 * fires the dialog's `cancel` event for the same keypress that the panel's own
 * dismiss handler sees, so a modal dialog with an open dropdown closed
 * entirely on one Escape. The panel's `hide()` is debounced, so it is still
 * mounted when `cancel` arrives; the next Escape closes the dialog.
 */
function hasOpenFloatingPanel(dialogElement: Element): boolean {
  const overlay = dialogElement.querySelector(OVERLAY_SELECTOR);
  if (!overlay) return false;
  return Array.from(overlay.children).some(
    (child) => child.getAttribute(OVERLAY_KIND_ATTRIBUTE) !== "tooltip",
  );
}

type FloatingInstance = BehaviorInstance<FloatingProps> & {
  show: () => void;
  hide: () => void;
  panelId: string;
};

// The per-anchor persistent state a floating component needs (position
// cleanup, the inserted panel node, debounce timer) used to live in
// createFloating()'s own closure — but that closure is recreated fresh every
// time a reactive ancestor re-renders the anchor (popover()/tooltip() called
// again on the SAME reused DOM element). Only the FIRST-ever generation's
// _onMount ever fires (ElementNode hooks run once per node), so imperative,
// document-level listeners (outside-click, Escape-inside-panel) that closed
// over that generation's `openState`/`reference`/`floating` kept acting on an
// orphaned copy forever, while live-rebound trigger events (onClick etc.)
// moved on to whatever generation was actually current — the trigger opened
// the panel, but nothing could ever close it again from outside.
//
// Fixed by moving all of this into ONE `behavior()` instance per (anchor,
// kind): `attach` runs once, and every later generation's `show`/`hide`
// calls and `_behaviors` re-declaration route into that SAME instance via
// `getBehavior`/`update()` — so there is exactly one canonical `openState`/
// `reference`/`floating` for the anchor's whole lifetime, not one per
// generation.
function attachFloating(
  node: ElementNode,
  initialProps: FloatingProps,
): FloatingInstance {
  let {
    openState,
    onDismiss,
    placement,
    content,
    keepOpenOnContentHover,
    openDelay,
    closeDelay,
  } = initialProps;
  const { kind } = initialProps;
  const behaviorKey = `floating:${kind}`;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cleanup: (() => void) | null = null;
  let floating: HTMLElement | null = null;
  let floatingNode: ElementNode | null = null;
  let mounted = false;

  const reference = node.domElement as HTMLElement;
  const rootNode = node.getRoot();
  const panelId = floatingPanelId(kind, node);

  const floatingPartial: PartialElement = {
    style: {
      position: "fixed",
      pointerEvents: "auto",
      visibility: (listener) =>
        openState.get(listener) ? "visible" : "hidden",
    },
    // Escape must dismiss the panel from INSIDE it too: the content is
    // portaled as a DOM sibling of the anchor, so a keydown on a focused
    // element within the panel (menu item, calendar cell, footer button)
    // never bubbles to the anchor's own Escape handler.
    //
    // Top-layer gated, like the document-level handler below. A nested
    // popover's TRIGGER is an ordinary element inside the outer panel, so an
    // Escape pressed there bubbles into this handler on the OUTER panel:
    // measured in Chromium, `outer trigger -> click -> inner trigger ->
    // Escape` removed BOTH panels at once and returned focus two levels, to
    // the outer trigger. Only the innermost open layer dismisses, and it
    // stops the event so no ancestor panel sees the same keypress.
    onKeyDown: (event) => {
      if ((event as KeyboardEvent).key !== "Escape") return;
      if (!isTopLayer()) return;
      event.stopPropagation();
      hide();
    },
    onMouseEnter: () => keepOpenOnContentHover && show(),
    onMouseLeave: () => keepOpenOnContentHover && hide(),
    _onMount: (mountedNode) => {
      floating = mountedNode.domElement as HTMLElement;
      // Stamped as a plain DOM property (not node.attributes.set) so a later
      // floatingNode.patch(content) — which strips undeclared ATTRIBUTES from
      // its own bookkeeping — never removes it. A consumer-declared id on the
      // content element wins.
      if (!floating.id) floating.id = panelId;
      floating.setAttribute(OVERLAY_KIND_ATTRIBUTE, kind);
      // Propagate data-theme from the trigger's ancestor so floating content
      // inherits CSS variable scope. Stamped on the PANEL, not the shared
      // overlay: the one overlay serves every floating component under the
      // root, so an overlay-level stamp would let whichever anchor opened
      // FIRST permanently impose its theme on later panels anchored under a
      // different [data-theme] scope. Skipped when the content declares its
      // own data-theme.
      if (reference && floating && !floating.hasAttribute("data-theme")) {
        const dataTheme = reference
          .closest("[data-theme]")
          ?.getAttribute("data-theme");
        if (dataTheme) floating.setAttribute("data-theme", dataTheme);
      }
    },
    _portal: (rNode) => {
      // showModal() puts the dialog in the top layer, above every z-index.
      // A panel portaled to the root overlay (z-index 20) would paint UNDER
      // an open dialog — drop it into the ancestor dialog instead so it
      // shares the top layer.
      const dialogHost = reference.closest("dialog");
      if (dialogHost) {
        let overlay = dialogHost.querySelector(OVERLAY_SELECTOR);
        if (!overlay) {
          overlay = dialogHost.ownerDocument.createElement("div");
          overlay.setAttribute(OVERLAY_ATTRIBUTE, "");
          Object.assign((overlay as HTMLElement).style, {
            position: "fixed",
            inset: "0",
            zIndex: "20",
            pointerEvents: "none",
          });
          dialogHost.appendChild(overlay);
        }
        return overlay;
      }
      // `:scope >` is load-bearing. The in-dialog branch above creates a
      // SECOND overlay container inside the <dialog>. A plain descendant
      // `querySelector("[data-domphy-floating]")` returns the first match in
      // document order — the dialog's copy — so
      // once any popover/tooltip/select had been opened inside a modal
      // dialog, every later floating panel in the whole app was portaled
      // into that dialog. Measured: with the dialog closed (display:none,
      // set by dialog.ts's finalizeClose) the panel reported
      // aria-expanded="true" and visibility:visible while its items had a
      // 0x0 rect and could not take focus. The root's own overlay is always
      // inserted as a DIRECT child of the root, so scoping is exact.
      let overlay = rNode.domElement!.querySelector(OVERLAY_SELECTOR);
      if (!overlay) {
        const overlayEle: DomphyElement<"div"> = {
          div: [],
          [OVERLAY_ATTRIBUTE]: "",
          style: {
            position: "fixed",
            inset: 0,
            zIndex: 20,
            pointerEvents: "none",
          },
        };
        const overlayNode = rNode.children!.insert(overlayEle) as ElementNode;
        overlay = overlayNode.domElement!;
      }
      return overlay;
    },
  };

  // Later generations declare their OWN fresh `content` object (a new object
  // literal at the popover()/tooltip() call site) — wire it every time, not
  // just at attach, so the panel wiring (theming, portal, dismiss handlers)
  // is present regardless of which generation's content ends up mounted.
  const wireContent = (target: DomphyElement) => merge(target, floatingPartial);
  wireContent(content);

  const ensureMounted = () => {
    if (mounted) return;
    mounted = true;
    floatingNode = rootNode.children!.insert(content) as ElementNode;
    // Expose THIS instance on the panel node too: the panel is portaled as a
    // child of the ROOT (not of the anchor), so getBehavior's ancestor walk
    // from a panel descendant (a selectBox/combobox option, a datePicker day
    // cell) never reaches the anchor's registration. Registering the same
    // instance on the panel lets panel-originated events resolve it via
    // `node.getBehavior(behaviorKey)` — the documented walk-up pattern. The
    // registration must be withdrawn again before the panel node is removed
    // (see detachPanel): its lifetime is owned by the ANCHOR, not the panel.
    floatingNode._behaviorInstances.set(behaviorKey, instance);
  };

  // ElementNode teardown DESTROYS every instance in the removed node's
  // `_behaviorInstances` (BeforeRemove hook + _dispose). The panel carries a
  // registration of the ANCHOR's instance, so removing the panel used to
  // destroy the anchor's behavior with it: measured in Chromium, after the
  // FIRST close of any popover/menu/select/tooltip the document-level
  // outside-click and Escape listeners were gone, and the component could
  // then only be closed by clicking its own trigger again. Withdraw the
  // borrowed registration first so only the panel's own state dies with it.
  const detachPanel = () => {
    if (!floatingNode) return;
    floatingNode._behaviorInstances.delete(behaviorKey);
    floatingNode.remove();
    floatingNode = null;
  };

  const instantShow = () => {
    // A re-render can detach the panel DOM without going through
    // instantHide (overlay reconcile, in-place patch). If we still think
    // we are mounted, skip insert and the panel never comes back.
    if (mounted && (!floating || !floating.isConnected)) {
      cleanup?.();
      cleanup = null;
      floatingNode = null;
      floating = null;
      mounted = false;
    }
    ensureMounted();
    if (reference && floating) {
      cleanup?.();
      cleanup = autoUpdate(reference, floating, () => {
        computePosition(reference as HTMLElement, floating as HTMLElement, {
          placement: placement.get() as Placement,
          // rootBoundary deliberately stays at the upstream default
          // ('viewport', i.e. the VISUAL viewport): with strategy "fixed" the
          // 1.8.0 'layoutViewport' option would stop clamping flip/shift to
          // the visible area, letting a panel land (partly) outside the
          // visible viewport during mobile pinch-zoom — a worse failure than
          // the jumpiness it fixes. Pinch-zoom/keyboard drift is already
          // handled by autoUpdate's post-1.8.0 observeMove re-anchoring.
          middleware: [offset(12), flip(), shift()],
          strategy: "fixed",
        }).then(({ x, y, placement: resolved }) => {
          // Teardown can run while computePosition's async work is in
          // flight (it nulls `floating` and removes the panel) — skip the
          // late positioning instead of dereferencing null.
          if (!floating) return;
          Object.assign(floating.style, {
            left: `${x}px`,
            top: `${y}px`,
          });
          placement.set(resolved);
        });
      });
      writeOpen(openState, true);
    }
  };
  // True only while the panel itself owns the focus. Shadow-root aware:
  // `document.activeElement` reports the shadow HOST for focus inside a shadow
  // tree, so `floating.contains(...)` would say false for a panel rendered in
  // one — ask the panel's own root instead.
  const focusIsInsidePanel = (): boolean => {
    if (!floating) return false;
    const root = floating.getRootNode() as Document | ShadowRoot;
    const active = (root as DocumentOrShadowRoot).activeElement;
    return !!active && floating.contains(active);
  };

  // The anchor is not always the focusable element: combobox anchors its panel
  // to the WRAPPER div and the tab stop is the `<input>` inside it, so a bare
  // reference.focus() was a no-op there and focus still ended on <body>
  // (measured). Fall back to the anchor's first tab stop.
  const focusReference = (): void => {
    if (!reference) return;
    reference.focus?.();
    const root = reference.getRootNode() as Document | ShadowRoot;
    const active = (root as DocumentOrShadowRoot).activeElement;
    if (active && reference.contains(active)) return;
    reference
      .querySelector<HTMLElement>(
        'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
      )
      ?.focus?.();
  };

  // Fully unmounts (not just CSS-hides) the panel — mirrors show()'s own
  // insert-on-demand: a closed floating component holds no DOM/listeners.
  // ensureMounted() re-inserts a fresh panel node next time show() runs.
  // Visual unmount runs even when the source is read-only (Computed).
  const instantHide = () => {
    cleanup?.();
    cleanup = null;
    // WCAG 2.4.3 Focus Order: removing the panel while it holds the focus
    // drops the caret to <body> and strands a keyboard user at the top of the
    // document (measured: selectBox trigger -> ArrowDown -> Escape left
    // document.activeElement === BODY). Radix DismissableLayer and React Aria
    // both return focus to the trigger. The containment test IS the
    // "don't steal focus" guard Radix gets from its pointer/focus-outside
    // tracking: if the dismissal happened because the user clicked or tabbed
    // to something else, the focus already left the panel and we leave it
    // alone. With nested panels only the innermost one contains the focus, so
    // Escape returns focus exactly one level.
    const restoreFocus = focusIsInsidePanel();
    detachPanel();
    floating = null;
    mounted = false;
    if (restoreFocus) focusReference();
    dismissOpen(openState, onDismiss);
  };
  const show = () => {
    timer && clearTimeout(timer);
    timer = setTimeout(instantShow, openDelay);
  };
  const hide = () => {
    timer && clearTimeout(timer);
    timer = setTimeout(instantHide, closeDelay);
  };

  const handleOutside = (event: MouseEvent) => {
    if (!openState.get() || !reference || !floating) return;
    const target = event.target as Node;
    if (!reference.contains(target) && !floating.contains(target)) hide();
  };
  rootNode.domElement?.addEventListener("click", handleOutside);

  // Escape must dismiss an open panel from ANYWHERE, not just from the
  // trigger or inside the panel (peer parity: Radix DismissableLayer closes
  // on a document-level Escape) — a hover-opened tooltip with focus sitting
  // on <body> otherwise ignores Escape entirely. Keyboard events target the
  // FOCUSED element and bubble UP, so unlike the outside-click listener this
  // one must live on the document (keydown is composed, so panels inside a
  // shadow root still reach it). Idempotent alongside the trigger/panel-level
  // Escape handlers: hide() is debounced and re-arming it on an
  // already-closed panel is a no-op.
  // ...but only for the TOP layer. Panels portal as siblings of one another in
  // the shared overlay container in mount order, so the last element
  // child is the innermost open layer — the same stack Radix's DismissableLayer
  // keeps. Without this, a document-level Escape closed every open panel at
  // once: measured with a popover opened from inside another popover, one
  // Escape removed both, and because the outer's hide() ran first it tore out
  // the inner's trigger, so the restored focus landed on a detached element and
  // fell through to <body>. The panel's own `onKeyDown` above still closes
  // whichever layer actually holds the focus.
  const isTopLayer = () =>
    !!floating && floating.parentElement?.lastElementChild === floating;
  const handleEscape = (event: Event) => {
    if (
      (event as KeyboardEvent).key === "Escape" &&
      openState.get() &&
      isTopLayer()
    )
      hide();
  };
  const escapeTarget: EventTarget | null =
    rootNode.domElement?.ownerDocument ?? rootNode.domElement ?? null;
  escapeTarget?.addEventListener("keydown", handleEscape);

  // Caller-driven open (open.set(true) / open:true) must insert the panel —
  // show()/hide() are only the trigger-event path. Guard with `mounted` so
  // instantShow/instantHide's own writeOpen/dismissOpen does not recurse
  // (writable State.set notifies listeners).
  const onOpen = (val: boolean) => {
    if (val) {
      if (!mounted) instantShow();
    } else if (mounted) {
      instantHide();
    }
  };
  let release = () => {};
  let destroyed = false;
  let updating = false;
  let instance: FloatingInstance;

  // Stamped after `instance` exists. The panel is patched in place on every
  // generation; patch() prunes _behaviorInstances keys absent from the new
  // descriptor and destroy()s them. The instance is SHARED with the anchor —
  // pruning it unmounts the live panel. Declaring the key on the content
  // keeps prune from treating it as leftover.
  const stampPanelBehavior = (target: DomphyElement) => {
    target._behaviors = {
      ...(target._behaviors ?? {}),
      [behaviorKey]: { attach: () => instance, props: {} },
    };
  };

  instance = {
    show,
    hide,
    panelId,
    update(props) {
      if (updating) return;
      onDismiss = props.onDismiss;
      if (props.openState !== openState) {
        release();
        openState = props.openState;
        // emitCurrent false: a fresh uncontrolled toState(false) on a reused
        // node is not a caller close.
        release = subscribeOpen(openState, onOpen, false);
        // Show if the new object is already true (open:true / caller-owned).
        if (openState.get()) instantShow();
      }
      placement = props.placement;
      content = props.content;
      keepOpenOnContentHover = props.keepOpenOnContentHover;
      openDelay = props.openDelay;
      closeDelay = props.closeDelay;
      wireContent(content);
      stampPanelBehavior(content);
      // Reflect the new generation's declared content into the already-
      // mounted panel in place (same DOM node, no flicker/teardown) — the
      // ordinary reused-node "patch, don't recreate" contract, applied to
      // the imperatively-inserted panel too.
      if (floatingNode) {
        updating = true;
        try {
          floatingNode.patch(content);
        } finally {
          updating = false;
        }
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      cleanup?.();
      cleanup = null;
      detachPanel();
      floating = null;
      mounted = false;
      release();
      release = () => {};
      rootNode.domElement?.removeEventListener("click", handleOutside);
      escapeTarget?.removeEventListener("keydown", handleEscape);
    },
  };
  stampPanelBehavior(content);
  // After `instance` exists: ensureMounted registers it on the panel node.
  // subscribeOpen notifies immediately (replaces onOpen(openState.get())).
  release = subscribeOpen(openState, onOpen);
  return instance;
}

function createFloating(props: {
  kind: string;
  open?: ValueOrState<boolean>;
  onDismiss?: () => void;
  placement: State<Placement>;
  content: DomphyElement;
  keepOpenOnContentHover?: boolean;
  // Hover-intent debounce, in ms. Defaults to FLOATING_DEFAULT_DELAY_MS.
  openDelay?: number;
  closeDelay?: number;
}) {
  const { kind, placement, onDismiss } = props;
  const openState = asOpenState(props.open);
  const behaviorKey = `floating:${kind}`;

  // Trigger event handlers ARE live-rebound on every patch and already
  // receive the current ElementNode as their 2nd argument (unlike lifecycle
  // hooks) — so show(node)/hide(node) just forward to whatever instance is
  // attached there, regardless of which generation's closure is calling.
  const show = (node?: ElementNode) =>
    node?.getBehavior<FloatingInstance>(behaviorKey)?.show();
  const hide = (node?: ElementNode) =>
    node?.getBehavior<FloatingInstance>(behaviorKey)?.hide();

  // Plain spread, NOT merge(): merge() defensively deep-clones its `target`
  // argument, which would snapshot `props.content` right now — but the
  // caller (popover()/tooltip()) hasn't finished mutating it yet (it pushes
  // its OWN partial onto `content.$` right after this call returns). A
  // premature clone silently drops that later mutation, so the panel loses
  // its role/style/dismiss wiring. Spread keeps the `_behaviors` record's
  // `props.content` a live reference to the SAME object the caller mutates.
  const anchorPartial: PartialElement = {
    onKeyDown: (e: Event, node: ElementNode) =>
      (e as KeyboardEvent).key === "Escape" && hide(node),
    ...behavior<FloatingProps>(behaviorKey, attachFloating, {
      kind,
      openState,
      onDismiss,
      placement,
      content: props.content,
      keepOpenOnContentHover: !!props.keepOpenOnContentHover,
      openDelay: props.openDelay ?? FLOATING_DEFAULT_DELAY_MS,
      closeDelay: props.closeDelay ?? FLOATING_DEFAULT_DELAY_MS,
    }),
  };

  return { show, hide, anchorPartial, openState };
}

export { createFloating, floatingPanelId, hasOpenFloatingPanel };
