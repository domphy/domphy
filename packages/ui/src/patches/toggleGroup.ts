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
import { horizontalArrowStep } from "../utils/direction.js";
import { focusRing } from "../utils/focusRing.js";

/** One item inside a toggle group. */
type ToggleItem = {
  /** Button label — plain string (auto-wrapped) or any DomphyElement. */
  label: string | DomphyElement;
  /** Stable key. Defaults to the item's zero-based index as a string. */
  key?: string;
};

type ToggleLive = {
  items: ToggleItem[];
  multiple: boolean;
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

function isPressed(val: string | string[], key: string): boolean {
  return Array.isArray(val) ? val.includes(key) : val === key;
}

function moveToggle(
  e: Event,
  items: ToggleItem[],
  key: string,
  value: State<string | string[]>,
  multiple: boolean,
): void {
  const k = (e as KeyboardEvent).key;
  // WAI-ARIA APG toolbar/radio navigation: both axes move (Right/Down = next,
  // Left/Up = previous), Home/End jump to the ends.
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(k)
  )
    return;
  e.preventDefault();
  const keys = items.map((item, index) => item.key ?? String(index));
  const idx = keys.indexOf(key);
  let next = idx;
  if (k === "ArrowDown") next = (idx + 1) % keys.length;
  else if (k === "ArrowUp") next = (idx - 1 + keys.length) % keys.length;
  else if (k === "ArrowRight" || k === "ArrowLeft") {
    const step = horizontalArrowStep(k, e.target as Element);
    next = (idx + step + keys.length) % keys.length;
  } else if (k === "Home") next = 0;
  else if (k === "End") next = keys.length - 1;
  if (!multiple) value.set(keys[next]);
  const group = (e.target as HTMLElement).closest("[role=group]");
  group?.querySelectorAll<HTMLElement>("button")[next]?.focus();
}

function buildToggleButtons(
  items: ToggleItem[],
  value: State<string | string[]>,
  focusedKey: State<string | null>,
  multiple: boolean,
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
      role: "button",
      ariaPressed: (l: Listener) => isPressed(value.get(l), key),
      // Roving tab stop: the last-focused item, like single-select mode and
      // the menu/tabs patches (WAI-ARIA APG). Falls back to the first
      // selected item, then the first item, until focus has landed once.
      tabIndex: (l: Listener) => {
        const val = value.get(l);
        if (multiple) {
          const focused = focusedKey.get(l);
          if (focused !== null) return key === focused ? 0 : -1;
          const arr = Array.isArray(val) ? val : [];
          const fallback = arr[0] ?? items[0]?.key ?? "0";
          return key === fallback ? 0 : -1;
        }
        if (val === key) return 0;
        if (val === "" && key === (items[0]?.key ?? "0")) return 0;
        return -1;
      },
      onFocus: () => focusedKey.set(key),
      onClick: () => {
        const val = value.get();
        if (multiple) {
          const arr = Array.isArray(val) ? [...val] : [];
          value.set(
            arr.includes(key) ? arr.filter((v) => v !== key) : [...arr, key],
          );
        } else {
          value.set(val === key ? "" : key);
        }
      },
      onKeyDown: (e: Event) => moveToggle(e, items, key, value, multiple),
      style: {
        cursor: "pointer",
        fontSize: (l: Listener) => themeSize(l, "inherit"),
        height: themeSpacing(6),
        paddingBlock: themeSpacing(1),
        paddingInline: themeSpacing(2),
        border: "none",
        borderRadius: themeSpacing(1.5),
        // Unpressed: shift-13 for readable resting labels (catalog contrast).
        color: (l: Listener) => themeColor(l, "shift-13", color),
        backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
        transition:
          "background-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
        "&:hover:not([disabled]):not([aria-pressed=true])": {
          color: (l: Listener) => themeColor(l, "shift-13", color),
          backgroundColor: (l: Listener) => themeColor(l, "hover", color),
        },
        "&:active:not([disabled])": {
          backgroundColor: (l: Listener) => themeColor(l, "increase-2", color),
        },
        "&[aria-pressed=true]": {
          backgroundColor: (l: Listener) =>
            themeColor(l, "shift-3", accentColor),
          color: (l: Listener) => themeColor(l, "shift-13", accentColor),
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
}

/**
 * All-in-one toggle group — single or multi-select button group. Generates
 * `<button>` toggle elements from the `items` array. Apply to any wrapper element.
 *
 * @param props.items - Item definitions `{ label, key? }`.
 * @param props.value - Selected key(s) (value or State). Defaults to `[]` (multiple) or `""` (single).
 * @param props.multiple - Allow multiple items selected at once. Defaults to `false`.
 * @param props.color - Theme color for the group background/border. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for the pressed state. Defaults to `"primary"`.
 * @example
 * { div: null, $: [toggleGroup({ multiple: true, items: [
 *   { label: "Bold",   key: "bold"   },
 *   { label: "Italic", key: "italic" },
 * ] })] }
 */
function toggleGroup(
  props: {
    items: ToggleItem[];
    value?: ValueOrState<string | string[]>;
    multiple?: boolean;
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = { items: [] },
): PartialElement {
  const {
    items = [],
    multiple = false,
    color = "neutral",
    accentColor = "primary",
  } = props;
  const live: ToggleLive = { items, multiple, color, accentColor };

  return {
    role: "group",
    _onSchedule: (node, element) => {
      const value = persistValue(
        node,
        "toggleGroupValue",
        props.value,
        multiple ? [] : "",
      );
      // Publish the SAME state the buttons write to — see segmented.ts for why
      // a declared `_context` could not (disconnected State + notifier clobber
      // when ElementNode.patch re-merges `element._context`).
      node.setContext("toggleGroup", { value, multiple });
      const focusedKey = persistValue<string | null>(
        node,
        "toggleGroupFocusedKey",
        undefined,
        null,
      );
      (element as Record<string, unknown>)[node.tagName] = buildToggleButtons(
        items,
        value,
        focusedKey,
        multiple,
        color,
        accentColor,
      );
    },
    ...behavior<ToggleLive>(
      "toggle-items",
      (node) => ({
        update(snapshot) {
          const value = persistValue(
            node,
            "toggleGroupValue",
            props.value,
            snapshot.multiple ? [] : "",
          );
          const focusedKey = persistValue<string | null>(
            node,
            "toggleGroupFocusedKey",
            undefined,
            null,
          );
          node.children.update(
            buildToggleButtons(
              snapshot.items,
              value,
              focusedKey,
              snapshot.multiple,
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
    style: {
      display: "flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (l: Listener) => themeSize(l, "inherit"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
      color: (l: Listener) => themeColor(l, "text", color),
      outline: (l: Listener) => `1px solid ${themeColor(l, "border", color)}`,
      outlineOffset: "-1px",
    },
  };
}

export { toggleGroup };
export type { ToggleItem };
