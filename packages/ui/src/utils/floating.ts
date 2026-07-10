import {
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

// The SAME reused-node gap described below (in createFloating's own comment)
// also breaks teardown two OTHER ways, both traced back to the same cause: a
// factory like popover()/tooltip() called again by a reactive parent creates
// a brand new createFloating() closure (fresh `cleanup`/`floatingNode`/
// `openState` locals) on the SAME reused anchor DOM element — but only the
// FIRST-ever closure's `_onMount` actually fires, so only IT ever registers
// a BeforeRemove hook, and nothing ever tells an OLDER closure that a NEWER
// one has taken over.
//
// 1. Anchor removed while a LATER generation's panel is the one open: the
//    first closure's BeforeRemove hook (the only one that exists) tears down
//    ITS OWN (possibly never-shown) state, while the real, visible panel has
//    no cleanup wired to it — orphaned in the #domphy-floating portal.
// 2. Anchor merely RE-RENDERED while a panel is open (no removal at all —
//    e.g. hovering a tooltip, then an unrelated state change re-renders that
//    row): the live event handlers (onMouseLeave etc., rebound to the NEWEST
//    closure on every patch) now only ever reach the NEW closure's own
//    (never-shown) state. The OLD closure's actually-visible panel has no
//    live interaction path to it anymore — nothing can ever close it again,
//    not even moving the mouse away.
//
// Fix both by keying "what to tear down" off the anchor's live DOM element
// (stable across reuse) instead of a closure-local variable: every
// generation that touches this anchor first tears down whatever the
// PREVIOUS generation left behind (if it's a different generation — a
// closure never tears down its own current state on repeat interactions),
// then claims the slot for itself. Case 1 falls out of whichever hook did
// attach always reading the CURRENT slot instead of its own stale closure;
// case 2 falls out of "claiming" running on every real interaction, not just
// removal.
//
// Slots are keyed per `kind` (one per consumer component: popover, tooltip,
// selectBox, …), not one per element: two DIFFERENT floating components
// legitimately share one anchor (a button with a tooltip that opens a
// popover), and a single element-wide slot made every interaction of one
// tear down the other's live panel. Generational takeover only ever needs
// to evict the SAME component's previous generation.
const teardownByElement = new WeakMap<Element, Map<string, () => void>>();

function claimTeardownSlot(
  element: Element,
  kind: string,
  teardown: () => void,
): void {
  let slots = teardownByElement.get(element);
  if (!slots) {
    slots = new Map();
    teardownByElement.set(element, slots);
  }
  const previous = slots.get(kind);
  if (previous && previous !== teardown) previous();
  slots.set(kind, teardown);
}

function releaseTeardownSlots(element: Element): void {
  const slots = teardownByElement.get(element);
  if (!slots) return;
  teardownByElement.delete(element);
  slots.forEach((teardown) => teardown());
}

function createFloating(props: {
  kind: string;
  open?: ValueOrState<boolean>;
  placement: State<Placement>;
  content: DomphyElement;
}) {
  const { kind, open = false, placement } = props;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cleanup: (() => void) | null = null;
  let reference: HTMLElement | null = null;
  let floating: HTMLElement | null = null;
  let floatingNode: ElementNode | null = null;
  let rootNode: ElementNode | null = null;
  let mounted = false;
  const openState = toState(open);

  // Teardown must leave the closure RE-MOUNTABLE, not permanently dead: a
  // still-live instance can get its slot evicted (e.g. a stale generation's
  // teardown running via a handler that was never rebound) and later be shown
  // again. Resetting mounted/floatingNode lets ensureMounted re-insert the
  // panel; leaving them stale made show() position a detached node forever.
  const teardown = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    if (floatingNode) {
      floatingNode.remove();
      floatingNode = null;
    }
    floating = null;
    mounted = false;
    openState.set(false);
  };

  // `reference`/`rootNode` are normally captured once by anchorPartial's
  // _onMount — but ElementNode.patch() deliberately does NOT re-run lifecycle
  // hooks on a reused (already-mounted) DOM node ("hooks already ran"). A
  // factory like popover()/tooltip() that gets called AGAIN by a reactive
  // parent (a fresh createFloating() closure, fresh `reference`/`rootNode`
  // locals) never gets a second _onMount — so show()/hide() silently no-op
  // forever after any re-render of the trigger's ancestor. Event handlers,
  // unlike hooks, ARE live-rebound on every patch (see ElementNode._bindEvent)
  // and already receive the current ElementNode as their 2nd argument — so
  // show(node)/hide(node) (called from the trigger's onClick/onMouseEnter/…)
  // re-derive `reference`/`rootNode` from THAT, idempotently, on every call.
  // This makes each createFloating() instance self-sufficient regardless of
  // whether its own _onMount ever fired.
  const ensureReference = (node?: ElementNode) => {
    if (!node) return;
    rootNode = node.getRoot();
    reference = node.domElement as HTMLElement;
    if (reference) claimTeardownSlot(reference, kind, teardown);
  };

  const ensureMounted = () => {
    if (mounted || !rootNode) return;
    mounted = true;
    floatingNode = rootNode.children!.insert(props.content) as ElementNode;
  };

  const instantShow = () => {
    ensureMounted();
    if (reference && floating) {
      cleanup && cleanup();
      cleanup = autoUpdate(reference, floating, () => {
        computePosition(reference as HTMLElement, floating as HTMLElement, {
          placement: placement.get() as Placement,
          middleware: [offset(12), flip(), shift()],
          strategy: "fixed",
        }).then(({ x, y, placement: resolved }) => {
          Object.assign((floating as HTMLElement).style, {
            left: `${x}px`,
            top: `${y}px`,
          });
          placement.set(resolved);
        });
      });
      openState.set(true);
    }
  };
  const instantHide = () => {
    cleanup && cleanup();
    cleanup = null;
    openState.set(false);
  };
  const show = (node?: ElementNode) => {
    ensureReference(node);
    timer && clearTimeout(timer);
    timer = setTimeout(instantShow, 100);
  };
  const hide = (node?: ElementNode) => {
    ensureReference(node);
    timer && clearTimeout(timer);
    timer = setTimeout(instantHide, 100);
  };

  const floatingPartial: PartialElement = {
    style: {
      position: "fixed",
      pointerEvents: "auto",
      visibility: (listener) =>
        openState.get(listener) ? "visible" : "hidden",
    },
    _onMount: (node) => (floating = node.domElement as HTMLElement),
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
      // Propagate data-theme from the trigger's ancestor so floating content
      // inherits CSS variable scope. The portal is inserted as a sibling of
      // [data-theme] page components — without explicit propagation, themeColor()
      // vars are undefined inside the portal → transparent popover backgrounds.
      if (
        reference &&
        overlay instanceof HTMLElement &&
        !overlay.hasAttribute("data-theme")
      ) {
        const dataTheme = reference
          .closest("[data-theme]")
          ?.getAttribute("data-theme");
        if (dataTheme) overlay.setAttribute("data-theme", dataTheme);
      }
      return overlay;
    },
  };

  merge(props.content, floatingPartial);

  const anchorPartial: PartialElement = {
    onKeyDown: (e) => (e as KeyboardEvent).key === "Escape" && hide(),
    _onMount: (node) => {
      rootNode = node.getRoot();
      reference = node.domElement as HTMLElement;
      if (reference) claimTeardownSlot(reference, kind, teardown);

      const handleOutside = (event: MouseEvent) => {
        if (!openState.get() || !reference || !floating) return;
        const target = event.target as Node;
        if (!reference.contains(target) && !floating.contains(target)) {
          hide();
        }
      };
      node.getRoot().domElement!.addEventListener("click", handleOutside);

      // This _onMount only ever fires ONCE per real DOM element (a reused,
      // patched anchor never gets a second one) — so this is the single
      // opportunity to attach the BeforeRemove hook for that element's whole
      // lifetime. It must not tear down THIS closure's own (possibly stale)
      // `cleanup`/`floatingNode` directly — look up teardownByElement instead,
      // which always holds whichever generation last interacted with this
      // anchor (see the WeakMap comment above and ensureReference).
      node.addHook("BeforeRemove", () => {
        // Tear down the @domphy/floating autoUpdate loop (scroll/resize/rAF
        // listeners) and the floating panel itself — for EVERY kind anchored
        // to this element, since the anchor is going away. Without this,
        // removing the anchor while the overlay is open leaks observers that
        // keep positioning a detached node, or leaves the panel orphaned.
        if (reference) releaseTeardownSlots(reference);
        node.getRoot().domElement!.removeEventListener("click", handleOutside);
      });
    },
  };

  return { show, hide, anchorPartial };
}

export { createFloating };
