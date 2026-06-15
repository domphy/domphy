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
import { creatFloating } from "../utils/floating.js";
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

  let tooltipId: string | null = null;

  const contentElement: DomphyElement<"span"> = {
    span: (listener) => contentState.get(listener),
  };

  const { show, hide, anchorPartial } = creatFloating({
    open,
    placement: placeState,
    content: contentElement,
  });

  const tooltipPartial: PartialElement = {
    role: "tooltip",
    dataSize: "decrease-1",
    dataTone: "shift-17",
    _onInsert: (node) => {
      const id = node.attributes.get("id");
      tooltipId = id || node.nodeId;
      !id && node.attributes.set("id", tooltipId);
    },
    style: {
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
      color: (listener) => themeColor(listener, "shift-9"),
      backgroundColor: (listener) => themeColor(listener),
      fontSize: (listener) => themeSize(listener, "inherit"),
    },
    $: [popoverArrow({ placement: placeState, bordered: false })],
  };
  contentElement.$ ||= [];
  contentElement.$.push(tooltipPartial);

  const triggerPartial: PartialElement = {
    onMouseEnter: () => show(),
    onMouseLeave: () => hide(),
    onFocus: () => show(),
    onBlur: () => hide(),
    onKeyDown: (e) => (e as KeyboardEvent).key === "Escape" && hide(),
    _onMount: (node) =>
      tooltipId && node.attributes.set("ariaDescribedby", tooltipId),
  };

  merge(anchorPartial, triggerPartial);

  return anchorPartial;
}

export { tooltip };
