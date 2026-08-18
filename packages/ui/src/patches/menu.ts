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
          (
            document.getElementById(
              `menuitem${id}${keys[next]}`,
            ) as HTMLElement
          )?.focus();
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
          "&:hover:not([disabled]):not([aria-current=true])": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "hover", inner.color),
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
    let current = initial;
    return {
      update(next) {
        if (
          next.activeKey !== current.activeKey &&
          !next.activeKeyIsCallerOwned
        ) {
          next.activeKey.set(current.activeKey.get());
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
