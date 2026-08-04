import {
  type DomphyElement,
  type Listener,
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import type { Placement } from "@domphy/floating";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { createFloating, floatingPanelId } from "../utils/floating.js";

/**
 * Floating popover primitive. Attaches to its host as the anchor/trigger and
 * shows a floating `content` element (with `role="dialog"`) on click or hover,
 * positioned via `@domphy/floating`. Returns the anchor partial, which merges
 * trigger wiring (haspopup/expanded, focus/blur dismissal). Apply to the
 * trigger element you want the popover anchored to.
 *
 * @param props - Configuration.
 * @param props.openOn - Interaction that opens the popover: `"click"` or `"hover"`. Defaults to `"click"`.
 * @param props.open - Open state, accepts a value or `State`. Defaults to `false`.
 * @param props.placement - Floating placement (e.g. `"bottom"`, `"top-start"`), value or `State`. Defaults to `"bottom"`.
 * @param props.content - The floating content element to display.
 * @example { button: "Open", $: [popover({ openOn: "click", content: { div: "Hi" } })] }
 */
function popover(props: {
  openOn?: "click" | "hover";
  open?: ValueOrState<boolean>;
  placement?: ValueOrState<Placement>;
  content: DomphyElement;
}): PartialElement {
  const { open = false, placement = "bottom", openOn = "click" } = props;

  const openState = toState(open);
  const placeState = toState(placement);

  const { show, hide, anchorPartial } = createFloating({
    kind: "popover",
    open: openState,
    placement: placeState,
    content: props.content,
    // Hovering the panel itself (not just the trigger) must keep it open —
    // handled generically inside floating.ts's behavior instance.
    keepOpenOnContentHover: openOn === "hover",
  });

  // The panel id is derived from the ANCHOR's nodeId and stamped by the
  // shared floating behavior when the panel mounts (see floating.ts) — no
  // factory-scope id variable, which a re-rendered generation would lose.
  const popoverPartial: PartialElement = {
    role: "dialog",
    dataTone: "shift-14",
    style: {
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
      // Surface contract (dataTone-surface-contract): a tone-anchored panel
      // must declare BOTH background and text color — on the dark shift-14
      // surface, inherited portal context colors can fall below contrast.
      color: (l: Listener) => themeColor(l, "text"),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      outline: (l: Listener) => `1px solid ${themeColor(l, "border-strong")}`,
      outlineOffset: "-1px",
      boxShadow: elevation("medium"),
    },
  };

  props.content.$ ||= [];
  props.content.$.push(popoverPartial);

  const triggerPartial: PartialElement = {
    ariaHaspopup: "dialog",
    ariaExpanded: (listener) => openState.get(listener),
    // Declared as a reactive attribute (listener.elementNode is the anchor) so
    // it is present from first render — before the panel's first show() — and
    // is re-declared on every patch: attributes set imperatively (the old
    // _onMount attributes.set) are stripped by patch() on ancestor re-render.
    ariaControls: (listener) =>
      listener?.elementNode
        ? floatingPanelId("popover", listener.elementNode)
        : undefined,
    onMouseEnter: (_e, node) => openOn === "hover" && show(node),
    onMouseLeave: (_e, node) => openOn === "hover" && hide(node),
    onClick: (_e, node) => {
      if (openOn === "click") {
        if (openState.get()) {
          hide(node);
        } else {
          show(node);
        }
      }
    },
    onKeyDown: (e, node) => {
      if ((e as KeyboardEvent).key === "Escape" && openState.get()) hide(node);
    },
    onFocus: (_e, node) => openOn === "hover" && show(node),
    onBlur: (e, node) => {
      const related = (e as FocusEvent).relatedTarget as Node | null;
      const root = node.getRoot().domElement as Element;
      // Tabbing from the trigger INTO the panel must not close the popover.
      // The id is deterministic and selector-safe ([a-z0-9-] only — nodeId is
      // a letter + hex hash), so this lookup works for every generation —
      // the old factory-scope `popoverId` was null in any generation whose
      // content _onInsert had never run, letting the guard fall through.
      const floatingEl = root.querySelector(
        `#${floatingPanelId("popover", node)}`,
      );
      if (related && floatingEl?.contains(related)) return;
      hide(node);
    },
  };
  merge(anchorPartial, triggerPartial);

  return anchorPartial;
}

export { popover };
