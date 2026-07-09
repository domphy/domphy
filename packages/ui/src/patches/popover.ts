import {
  type DomphyElement,
  merge,
  type Listener,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import type { Placement } from "@domphy/floating";
import { themeColor } from "@domphy/theme";
import { createFloating } from "../utils/floating.js";

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

  let popoverId: string | null = null;
  const openState = toState(open);
  const placeState = toState(placement);

  const { show, hide, anchorPartial } = createFloating({
    open: openState,
    placement: placeState,
    content: props.content,
  });

  const popoverPartial: PartialElement = {
    role: "dialog",
    dataTone: "shift-14",
    style: {
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
    },
    onMouseEnter: () => openOn === "hover" && show(),
    onMouseLeave: () => openOn === "hover" && hide(),
    _onInsert: (node) => {
      const id = node.attributes.get("id");
      popoverId = id || node.nodeId;
      !id && node.attributes.set("id", popoverId);
    },
  };

  props.content.$ ||= [];
  props.content.$.push(popoverPartial);

  const triggerPartial: PartialElement = {
    ariaHaspopup: "dialog",
    ariaExpanded: (listener) => openState.get(listener),
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
      const floatingEl = popoverId
        ? root.querySelector(`#${CSS.escape(popoverId)}`)
        : null;
      if (related && floatingEl?.contains(related)) return;
      hide(node);
    },
    _onMount: (node) =>
      popoverId && node.attributes.set("ariaControls", popoverId),
  };
  merge(anchorPartial, triggerPartial);

  return anchorPartial;
}

export { popover };
