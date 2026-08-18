import {
  behavior,
  type DomphyElement,
  type ElementNode,
  isState,
  type Listener,
  type PartialElement,
  type State,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { focusRing } from "../utils/focusRing.js";

/** One item inside a segmented control. */
type SegmentedItem = {
  /** Button label — plain string (auto-wrapped) or any DomphyElement. */
  label: string | DomphyElement;
  /** Stable key. Defaults to the item's zero-based index. */
  key?: string;
};

type SegmentedLive = {
  items: SegmentedItem[];
  color: ThemeColor;
  accentColor: ThemeColor;
};

function persistValue<T>(
  node: ElementNode,
  key: string,
  incoming: ValueOrState<T> | undefined,
  fallback: T,
): State<T> {
  if (isState(incoming)) {
    node.setMetadata(key, incoming);
    return incoming as State<T>;
  }
  let stored = node.getMetadata(key) as State<T> | undefined;
  if (!stored) {
    stored = toState((incoming as T | undefined) ?? fallback);
    node.setMetadata(key, stored);
  }
  return stored;
}

function moveSegment(
  e: Event,
  items: SegmentedItem[],
  key: string,
  value: State<string>,
): void {
  const k = (e as KeyboardEvent).key;
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) return;
  e.preventDefault();
  const keys = items.map((item, index) => item.key ?? String(index));
  const idx = keys.indexOf(key);
  let next = idx;
  if (k === "ArrowRight") next = (idx + 1) % keys.length;
  else if (k === "ArrowLeft") next = (idx - 1 + keys.length) % keys.length;
  else if (k === "Home") next = 0;
  else if (k === "End") next = keys.length - 1;
  value.set(keys[next]);
  const group = (e.target as HTMLElement).closest("[role=radiogroup]");
  group?.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
}

function buildSegmentButtons(
  items: SegmentedItem[],
  value: State<string>,
  color: ThemeColor,
  accentColor: ThemeColor,
): DomphyElement<"button">[] {
  return items.map((item, index) => {
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
      tabIndex: (l: Listener) => {
        const current = value.get(l);
        if (current === key) return 0;
        if (current === "" && key === (items[0]?.key ?? "")) return 0;
        return -1;
      },
      onClick: () => value.set(key),
      onKeyDown: (e: Event) => moveSegment(e, items, key, value),
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
        "&:active:not([disabled]):not([aria-checked=true])": {
          backgroundColor: (l: Listener) => themeColor(l, "increase-2", color),
        },
        "&[aria-checked=true]": {
          backgroundColor: (l: Listener) =>
            themeColor(l, "shift-0", accentColor),
          color: (l: Listener) => themeColor(l, "shift-10", accentColor),
          // Selected segment sits slightly above the track.
          boxShadow: elevation("low"),
        },
        "&:focus-visible": {
          boxShadow: (l: Listener) => focusRing(l, accentColor),
        },
        "&[aria-checked=true]:focus-visible": {
          boxShadow: (l: Listener) =>
            `${elevation("low")}, ${focusRing(l, accentColor)}`,
        },
        "&[disabled]": {
          opacity: 0.7,
          cursor: "not-allowed",
        },
      },
    } as DomphyElement<"button">;
  });
}

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
  const live: SegmentedLive = { items, color, accentColor };

  return {
    role: "radiogroup",
    // Publish value so descendants can read the selected segment.
    _context: {
      segmented: { value: toState(props.value ?? items[0]?.key ?? "") },
    },
    _onSchedule: (node, element) => {
      const value = persistValue(
        node,
        "segmentedValue",
        props.value,
        items[0]?.key ?? "",
      );
      (element as Record<string, unknown>)[node.tagName] = buildSegmentButtons(
        items,
        value,
        color,
        accentColor,
      );
    },
    ...behavior<SegmentedLive>(
      "segmented-items",
      (node) => ({
        update(snapshot) {
          const value = persistValue(
            node,
            "segmentedValue",
            props.value,
            snapshot.items[0]?.key ?? "",
          );
          node.children.update(
            buildSegmentButtons(
              snapshot.items,
              value,
              snapshot.color,
              snapshot.accentColor,
            ),
            !!node.domElement,
            true,
          );
        },
      }),
      live,
    ),
    // Track is a soft surface anchor — shift via dataTone, paint with inherit.
    dataTone: "shift-2",
    style: {
      display: "inline-flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(0.5),
      borderRadius: themeSpacing(10),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
      color: (l: Listener) => themeColor(l, "text", color),
    },
  };
}

export { segmented };
export type { SegmentedItem };
