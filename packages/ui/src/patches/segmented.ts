import {
  type DomphyElement,
  type Listener,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/** One item inside a segmented control. */
type SegmentedItem = {
  /** Button label — plain string (auto-wrapped) or any DomphyElement. */
  label: string | DomphyElement;
  /** Stable key. Defaults to the item's zero-based index. */
  key?: string;
};

/**
 * All-in-one single-select segmented control. Generates `<button>` option
 * elements from the `items` array. Apply to any wrapper element.
 *
 * @param props.items - Item definitions `{ label, key? }`.
 * @param props.value - Initially selected key (value or State). Defaults to the first item's key.
 * @param props.color - Theme color for the control background. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for the selected item. Defaults to `"primary"`.
 * @example
 * { div: null, $: [segmented({ items: [
 *   { label: "Day",   key: "day"   },
 *   { label: "Month", key: "month" },
 *   { label: "Year",  key: "year"  },
 * ] })] }
 */
function segmented(
  props: {
    items: SegmentedItem[];
    value?: ValueOrState<string>;
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = { items: [] },
): PartialElement {
  const { items = [], color = "neutral", accentColor = "primary" } = props;
  const value = toState(props.value ?? items[0]?.key ?? "");

  return {
    role: "radiogroup",
    // Expose value in context so segmentedItem() escape-hatch still works.
    _context: { segmented: { value } },
    _onSchedule: (node, element) => {
      const buttons: DomphyElement<"button">[] = items.map((item, index) => {
        const key = item.key ?? String(index);
        const labelEl: DomphyElement =
          typeof item.label === "string"
            ? ({ span: item.label } as DomphyElement<"span">)
            : item.label;

        return {
          button: [labelEl],
          _key: key,
          type: "button",
          role: "radio",
          ariaChecked: (l: Listener) => value.get(l) === key,
          onClick: () => value.set(key),
          style: {
            cursor: "pointer",
            fontSize: (l: Listener) => themeSize(l, "inherit"),
            height: themeSpacing(6),
            paddingBlock: themeSpacing(1),
            paddingInline: themeSpacing(3),
            border: "none",
            borderRadius: themeSpacing(10),
            color: (l: Listener) => themeColor(l, "text", color),
            backgroundColor: "transparent",
            transition:
              "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
            "&:hover:not([disabled]):not([aria-checked=true])": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", color),
            },
            "&[aria-checked=true]": {
              backgroundColor: (l: Listener) =>
                themeColor(l, "shift-0", accentColor),
              color: (l: Listener) => themeColor(l, "shift-10", accentColor),
            },
            "&:focus-visible": {
              boxShadow: (l: Listener) => focusRing(l, accentColor),
            },
            "&[disabled]": {
              opacity: 0.7,
              cursor: "not-allowed",
            },
          },
        } as DomphyElement<"button">;
      });

      (element as any)[node.tagName] = buttons;
    },
    style: {
      display: "inline-flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(0.5),
      borderRadius: themeSpacing(10),
      backgroundColor: (l: Listener) => themeColor(l, "shift-2", color),
    },
  };
}

export { segmented };
export type { SegmentedItem };
