import {
  type BehaviorInstance,
  behavior,
  type DomphyElement,
  type ElementNode,
  merge,
  type PartialElement,
  type State,
  toState,
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

type FloatingProps = {
  openState: State<boolean>;
  placement: State<Placement>;
  content: DomphyElement;
  // popover's openOn === "hover" case: hovering the floating PANEL itself
  // (not just the anchor) must keep it open, so the pointer can travel from
  // trigger to panel without the debounced hide() firing first.
  keepOpenOnContentHover: boolean;
};

type FloatingInstance = BehaviorInstance<FloatingProps> & {
  show: () => void;
  hide: () => void;
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
  let { openState, placement, content, keepOpenOnContentHover } = initialProps;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cleanup: (() => void) | null = null;
  let floating: HTMLElement | null = null;
  let floatingNode: ElementNode | null = null;
  let mounted = false;

  const reference = node.domElement as HTMLElement;
  const rootNode = node.getRoot();

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
    onKeyDown: (event) => {
      if ((event as KeyboardEvent).key === "Escape") hide();
    },
    onMouseEnter: () => keepOpenOnContentHover && show(),
    onMouseLeave: () => keepOpenOnContentHover && hide(),
    _onMount: (mountedNode) => {
      floating = mountedNode.domElement as HTMLElement;
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
      let overlay = rNode.domElement!.querySelector(`#domphy-floating`);
      if (!overlay) {
        const overlayEle: DomphyElement<"div"> = {
          div: [],
          id: `domphy-floating`,
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
  };

  const instantShow = () => {
    ensureMounted();
    if (reference && floating) {
      cleanup?.();
      cleanup = autoUpdate(reference, floating, () => {
        computePosition(reference as HTMLElement, floating as HTMLElement, {
          placement: placement.get() as Placement,
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
      openState.set(true);
    }
  };
  // Fully unmounts (not just CSS-hides) the panel — mirrors show()'s own
  // insert-on-demand: a closed floating component holds no DOM/listeners.
  // ensureMounted() re-inserts a fresh panel node next time show() runs.
  const instantHide = () => {
    cleanup?.();
    cleanup = null;
    if (floatingNode) {
      floatingNode.remove();
      floatingNode = null;
    }
    floating = null;
    mounted = false;
    openState.set(false);
  };
  const show = () => {
    timer && clearTimeout(timer);
    timer = setTimeout(instantShow, 100);
  };
  const hide = () => {
    timer && clearTimeout(timer);
    timer = setTimeout(instantHide, 100);
  };

  const handleOutside = (event: MouseEvent) => {
    if (!openState.get() || !reference || !floating) return;
    const target = event.target as Node;
    if (!reference.contains(target) && !floating.contains(target)) hide();
  };
  rootNode.domElement?.addEventListener("click", handleOutside);

  return {
    show,
    hide,
    update(props) {
      openState = props.openState;
      placement = props.placement;
      content = props.content;
      keepOpenOnContentHover = props.keepOpenOnContentHover;
      wireContent(content);
      // Reflect the new generation's declared content into the already-
      // mounted panel in place (same DOM node, no flicker/teardown) — the
      // ordinary reused-node "patch, don't recreate" contract, applied to
      // the imperatively-inserted panel too.
      if (floatingNode) floatingNode.patch(content);
    },
    destroy() {
      if (timer) clearTimeout(timer);
      cleanup?.();
      floatingNode?.remove();
      rootNode.domElement?.removeEventListener("click", handleOutside);
    },
  };
}

function createFloating(props: {
  kind: string;
  open?: ValueOrState<boolean>;
  placement: State<Placement>;
  content: DomphyElement;
  keepOpenOnContentHover?: boolean;
}) {
  const { kind, open = false, placement } = props;
  const openState = toState(open);
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
      openState,
      placement,
      content: props.content,
      keepOpenOnContentHover: !!props.keepOpenOnContentHover,
    }),
  };

  return { show, hide, anchorPartial };
}

export { createFloating };
