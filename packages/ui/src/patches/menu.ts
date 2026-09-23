import {
  type BehaviorInstance,
  behavior,
  type DomphyElement,
  type ElementNode,
  type Listener,
  type PartialElement,
  type State,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  textToneOn,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { focusRing } from "../utils/focusRing.js";

/** One item inside a menu. */
type MenuItem = {
  /** Button label — plain string (auto-wrapped) or any DomphyElement (e.g. icon + text). */
  label: string | DomphyElement;
  /** Stable key. Defaults to the item's zero-based index. */
  key?: string | number;
  /** Called when the item is clicked. */
  onClick?: () => void;
};

/**
 * All-in-one vertical menu. Generates `<button>` `[role=menuitem]` elements
 * from the `items` array with keyboard navigation (Arrow/Home/End/Enter/Space).
 * Apply to any wrapper element (`div`, `ul`, …).
 *
 * @param props.items - Item definitions `{ label, key?, onClick? }`. Pass `[]`
 * to keep the wrapper's own children (escape hatch for fully custom rows —
 * only the menu container styling and `role="menu"` semantics apply then).
 * @param props.activeKey - Currently selected key (value or State). Defaults to `null`.
 * @param props.selectable - Whether items track and update the active selection. Defaults to `true`.
 * @param props.color - Background color tone for the menu. Defaults to `"neutral"`.
 * @param props.accentColor - Accent color for the active/focus item. Defaults to `"primary"`.
 * @example
 * { div: null, $: [menu({ items: [
 *   { label: "Profile",  key: "profile",  onClick: () => navigate("/profile")  },
 *   { label: "Settings", key: "settings", onClick: () => navigate("/settings") },
 * ] })] }
 */
function menu(
  props: {
    items: MenuItem[];
    activeKey?: ValueOrState<number | string | null>;
    selectable?: boolean;
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = { items: [] },
): PartialElement {
  const {
    items = [],
    selectable = true,
    color = "neutral",
    accentColor = "primary",
  } = props;
  const activeKey = toState(props.activeKey ?? null);
  const activeKeyIsCallerOwned = props.activeKey !== undefined;

  type MenuInner = {
    items: MenuItem[];
    activeKey: State<number | string | null>;
    activeKeyIsCallerOwned: boolean;
    selectable: boolean;
    color: ThemeColor;
    accentColor: ThemeColor;
    // Roving-tabindex cursor (WAI-ARIA APG menu pattern): exactly one item is
    // in the page tab order at a time; Arrow/Home/End move it. Kept on the
    // shared `inner` record (not a factory-scope variable) so every generation
    // of a reused node reads the same cursor.
    focusedKey: State<number | string | null>;
  };

  // The item that owns tabindex="0": the roving cursor if one has been set,
  // otherwise the selected item, otherwise the first item.
  const tabbableKey = (
    inner: MenuInner,
    listener: Listener,
  ): number | string | null => {
    const focused = inner.focusedKey.get(listener);
    if (focused !== null) return focused;
    const active = inner.selectable ? inner.activeKey.get(listener) : null;
    if (active !== null) return active;
    const first = inner.items[0];
    return first ? (first.key ?? 0) : null;
  };

  const buildItems = (
    node: ElementNode,
    inner: MenuInner,
  ): DomphyElement<"button">[] => {
    const id = node.nodeId;
    return inner.items.map((item, index) => {
      const key = item.key ?? index;
      return {
        button:
          typeof item.label === "string"
            ? [{ span: item.label } as DomphyElement<"span">]
            : [item.label],
        _key: key,
        type: "button",
        id: `menuitem${id}${key}`,
        role: "menuitem",
        tabIndex: (l: Listener) => (tabbableKey(inner, l) === key ? 0 : -1),
        onFocus: () => inner.focusedKey.set(key),
        ...(inner.selectable
          ? {
              ariaCurrent: (l: Listener) =>
                inner.activeKey.get(l) === key || undefined,
            }
          : {}),
        onClick: () => {
          if (inner.selectable) inner.activeKey.set(key);
          item.onClick?.();
        },
        onKeyDown: (e: Event) => {
          const k = (e as KeyboardEvent).key;
          if (k === "Enter" || k === " ") {
            e.preventDefault();
            (e.target as HTMLElement).click();
            return;
          }
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(k)) return;
          e.preventDefault();
          const keys = inner.items.map((it, i) => it.key ?? i);
          const idx = keys.indexOf(key);
          let next = idx;
          if (k === "ArrowDown") next = (idx + 1) % keys.length;
          else if (k === "ArrowUp")
            next = (idx - 1 + keys.length) % keys.length;
          else if (k === "Home") next = 0;
          else if (k === "End") next = keys.length - 1;
          // Resolved through the event target's own [role=menu] — shadow-root
          // safe, unlike a document.getElementById lookup (a menu rendered
          // inside a shadow root is invisible to the document-level id map,
          // so arrow keys silently did nothing there). Same resolution the
          // tabs patch already uses for its tablist.
          const list = (e.target as HTMLElement).closest("[role=menu]");
          list?.querySelectorAll<HTMLElement>("[role=menuitem]")[next]?.focus();
        },
        style: {
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(2),
          width: "100%",
          fontSize: (l: Listener) => themeSize(l, "inherit"),
          height: (l: Listener) => themeSpacing(6 + themeDensity(l) * 2),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          border: "none",
          outline: "none",
          // Menu panel is a light (shift-0) surface: "text" resolves to a
          // dark-on-light reading tone in both light and dark themes.
          color: (l: Listener) => themeColor(l, "text", inner.color),
          backgroundColor: (l: Listener) =>
            themeColor(l, "inherit", inner.color),
          transition:
            "background-color 140ms ease, box-shadow 140ms ease, color 140ms ease",
          // Label tracks the hover fill (+2) — a fixed "text" label measured
          // 3.58:1 against it (light) / 4.37:1 (dark), below WCAG AA.
          "&:hover:not([disabled]):not([aria-current=true])": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "hover", inner.color),
            color: (l: Listener) => themeColor(l, textToneOn(2), inner.color),
          },
          "&[aria-current=true]": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-3", inner.accentColor),
            color: (l: Listener) =>
              themeColor(l, "shift-13", inner.accentColor),
          },
          "&:focus-visible": {
            boxShadow: (l: Listener) => focusRing(l, inner.accentColor),
          },
        },
      } as DomphyElement<"button">;
    });
  };

  const attachMenu = (
    _node: ElementNode,
    initial: MenuInner,
  ): BehaviorInstance<MenuInner> => {
    // WAI-ARIA APG: when a menu opens, focus starts on the first item, not
    // wherever a PREVIOUS open left the roving cursor. attach() runs exactly
    // once per real DOM node — a genuine reopen (the menu's floating
    // container, e.g. popover, unmounts and remounts the panel on every
    // close/open) gets a fresh node and refires attach here, while an
    // in-place re-render (same node, e.g. mid-navigation Arrow presses)
    // never does — so this only resets on a real reopen, never mid-session.
    initial.focusedKey.set(null);
    let current = initial;
    return {
      update(next) {
        if (
          next.activeKey !== current.activeKey &&
          !next.activeKeyIsCallerOwned
        ) {
          next.activeKey.set(current.activeKey.get());
        }
        // Carry the roving cursor across generations too — a fresh factory
        // closure brings a fresh `toState(null)`, which would drop
        // tabindex="0" back onto the first item mid-keyboard-navigation.
        if (next.focusedKey !== current.focusedKey) {
          next.focusedKey.set(current.focusedKey.get());
        }
        current = next;
        // Empty items = the caller renders its own rows; leave children alone.
        if (current.items.length === 0) return;
        _node.children.update(buildItems(_node, current));
      },
    };
  };

  const inner: MenuInner = {
    items,
    activeKey,
    activeKeyIsCallerOwned,
    selectable,
    color,
    accentColor,
    focusedKey: toState<number | string | null>(null),
  };

  return {
    role: "menu",
    dataTone: "shift-0",
    _onSchedule: (node, element) => {
      // Empty items = the caller renders its own rows; leave children alone.
      if (items.length === 0) return;
      (element as Record<string, unknown>)[node.tagName] = buildItems(
        node,
        inner,
      );
    },
    ...behavior<MenuInner>("menu", attachMenu, inner),
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      fontSize: (l: Listener) => themeSize(l, "inherit"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
      color: (l: Listener) => themeColor(l, "text", color),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      outline: (l: Listener) =>
        `1px solid ${themeColor(l, "border-strong", color)}`,
      outlineOffset: "-1px",
      boxShadow: elevation("medium"),
    },
  };
}

export { menu };
export type { MenuItem };
