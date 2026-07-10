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
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

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

  return {
    role: "menu",
    dataTone: "shift-17",
    _onSchedule: (node, element) => {
      // Empty items = the caller renders its own rows; leave children alone.
      if (items.length === 0) return;
      const id = node.nodeId;

      const buttons: DomphyElement<"button">[] = items.map((item, index) => {
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
          ...(selectable
            ? {
                ariaCurrent: (l: Listener) =>
                  activeKey.get(l) === key || undefined,
              }
            : {}),
          onClick: () => {
            if (selectable) activeKey.set(key);
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
            const keys = items.map((it, i) => it.key ?? i);
            const idx = keys.findIndex((ki) => ki === key);
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
            color: (l: Listener) => themeColor(l, "shift-9", color),
            backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
            "&:hover:not([disabled]):not([aria-current=true])": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-2", color),
            },
            "&[aria-current=true]": {
              backgroundColor: (l: Listener) =>
                themeColor(l, "shift-3", accentColor),
              color: (l: Listener) => themeColor(l, "shift-10"),
            },
            "&:focus-visible": {
              outline: (l: Listener) =>
                `${themeSpacing(0.5)} solid ${themeColor(l, "shift-6", accentColor)}`,
              outlineOffset: `-${themeSpacing(0.5)}`,
            },
          },
        } as DomphyElement<"button">;
      });

      (element as any)[node.tagName] = buttons;
    },
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      fontSize: (l: Listener) => themeSize(l, "inherit"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", color),
    },
  };
}

export { menu };
export type { MenuItem };
