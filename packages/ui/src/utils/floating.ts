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
// also breaks teardown-on-remove, the other direction: `anchorPartial`'s
// `_onMount` — where the ONE-EVER BeforeRemove hook gets registered, since
// _onMount by construction only fires on a node's true first mount — closes
// over THAT FIRST closure's own `cleanup`/`floatingNode` locals. If a LATER
// re-render's closure (fresh locals, same reused anchor element) is the one
// whose popover is actually open when the anchor finally gets removed, the
// first closure's hook tears down ITS OWN (possibly never-shown) state while
// the real, visible floating panel has no cleanup wired to it at all —
// orphaned in the #domphy-floating portal at its last screen position.
// Route "what to tear down on remove" through this WeakMap, keyed by the
// anchor's live DOM element (stable across reuse, unlike the closure)
// instead of a closure-local variable: every generation overwrites the same
// slot on each interaction, so the one hook that does attach always tears
// down whichever generation is CURRENTLY live.
const teardownByElement = new WeakMap<Element, () => void>();

function createFloating(props: {
  open?: ValueOrState<boolean>;
  placement: State<Placement>;
  content: DomphyElement;
}) {
  const { open = false, placement } = props;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cleanup: (() => void) | null = null;
  let reference: HTMLElement | null = null;
  let floating: HTMLElement | null = null;
  let floatingNode: ElementNode | null = null;
  let rootNode: ElementNode | null = null;
  let mounted = false;
  const openState = toState(open);

  const teardown = () => {
    if (timer) clearTimeout(timer);
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    floatingNode && floatingNode.remove();
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
    if (reference) teardownByElement.set(reference, teardown);
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
      if (reference) teardownByElement.set(reference, teardown);

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
        // listeners) and the floating panel itself. Without this, removing
        // the anchor while the overlay is open leaks observers that keep
        // positioning a detached node, or leaves the panel orphaned on screen.
        if (reference) teardownByElement.get(reference)?.();
        node.getRoot().domElement!.removeEventListener("click", handleOutside);
      });
    },
  };

  return { show, hide, anchorPartial };
}

export { createFloating };
