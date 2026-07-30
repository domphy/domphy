import {
  type DomphyElement,
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import type { Placement } from "@domphy/floating";
import {
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { createFloating, floatingPanelId } from "../utils/floating.js";
import { popoverArrow } from "./popoverArrow.js";

/**
 * Attaches a floating tooltip to the host element, shown on hover/focus and
 * hidden on leave/blur/Escape. Returns the anchor (trigger) partial; the tooltip
 * surface is positioned via the floating utility and linked with
 * `aria-describedby`. No host tag check; applied to the trigger element.
 *
 * @param props.open - Controlled open state. Optional, accepts a value or state. Defaults to `false`.
 * @param props.placement - Floating placement relative to the trigger. Optional, accepts a value or state (`Placement`). Defaults to `"top"`.
 * @param props.content - Tooltip text content. Optional, accepts a value or state (string only). Defaults to `"Tooltip Content"`.
 * @example { button: "Hover me", $: [tooltip({ content: "Help text" })] }
 */
function tooltip(
  props: {
    open?: ValueOrState<boolean>;
    placement?: ValueOrState<Placement>;
    content?: ValueOrState<string>;
  } = {},
): PartialElement {
  const {
    open = false,
    placement = "top",
    content = "Tooltip Content",
  } = props;

  const placeState = toState(placement);
  const contentState = toState(content);

  // The tooltip id is NOT pre-generated here: a factory-scope id (previously
  // Math.random()-based) churns per generation and mismatches SSR/hydration.
  // Instead the shared floating behavior stamps a deterministic id derived
  // from the anchor's nodeId when the panel mounts (see floating.ts), and the
  // trigger references the same id via _onSchedule below.
  const contentElement: DomphyElement<"span"> = {
    span: (listener) => contentState.get(listener),
  };

  const { show, hide, anchorPartial } = createFloating({
    kind: "tooltip",
    open,
    placement: placeState,
    content: contentElement,
  });

  const tooltipPartial: PartialElement = {
    role: "tooltip",
    dataSize: "decrease-1",
    dataTone: "shift-17",
    style: {
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      color: (listener) => themeColor(listener, "text"),
      backgroundColor: (listener) => themeColor(listener),
      fontSize: (listener) => themeSize(listener, "inherit"),
      boxShadow: elevation("low"),
    },
    $: [popoverArrow({ placement: placeState, bordered: false })],
  };
  contentElement.$ ||= [];
  contentElement.$.push(tooltipPartial);

  const triggerPartial: PartialElement = {
    // Declared as a reactive attribute (listener.elementNode is the anchor) so
    // it is present from first render — before the tooltip's first show() —
    // and is re-declared on every patch (patch() strips attributes that are
    // no longer declared, so imperative wiring would not survive re-render).
    ariaDescribedby: (listener) =>
      listener?.elementNode
        ? floatingPanelId("tooltip", listener.elementNode)
        : undefined,
    onMouseEnter: (_e, node) => show(node),
    onMouseLeave: (_e, node) => hide(node),
    onFocus: (_e, node) => show(node),
    onBlur: (_e, node) => hide(node),
    onKeyDown: (e, node) => (e as KeyboardEvent).key === "Escape" && hide(node),
  };

  merge(anchorPartial, triggerPartial);

  return anchorPartial;
}

export { tooltip };
