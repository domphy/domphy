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
import { focusRing } from "../utils/focusRing.js";

/** One tab entry: a trigger label and its panel content. */
type TabItem = {
  /** Tab button label — a plain string (auto-wrapped in span) or any DomphyElement. */
  label: string | DomphyElement;
  /** Panel content rendered when this tab is active. */
  content: DomphyElement;
  /** Stable identity key. Defaults to the item's zero-based index. */
  key?: string | number;
};

/**
 * All-in-one tabs patch. Generates a `[role=tablist]` button row and
 * `[role=tabpanel]` panels from the `items` array. Apply to any wrapper
 * element (`div`, `section`, …). No companion `tab()` / `tabPanel()` needed.
 *
 * To control the active tab programmatically, pass an external `State` as
 * `activeKey` and call `.set()` on it from outside.
 *
 * @param props.items - Tab definitions `{ label, content, key? }`.
 * @param props.activeKey - Initially active key (value or State). Defaults to the first item's key.
 * @param props.accentColor - Theme color for the active underline indicator. Defaults to `"primary"`.
 * @param props.color - Theme color for the resting underline. Defaults to `"neutral"`.
 * @example
 * { div: null, $: [tabs({ items: [
 *   { label: "Overview", content: { p: "Overview content" } },
 *   { label: "API",      content: { p: "API content"      } },
 * ] })] }
 */
function tabs(
  props: {
    items: TabItem[];
    activeKey?: ValueOrState<string | number>;
    accentColor?: ThemeColor;
    color?: ThemeColor;
  } = { items: [] },
): PartialElement {
  const { items = [], accentColor = "primary", color = "neutral" } = props;
  const activeKey = toState(props.activeKey ?? items[0]?.key ?? 0);

  return {
    _onSchedule: (node, element) => {
      const id = node.nodeId;

      const buttons: DomphyElement<"button">[] = items.map((item, index) => {
        const key = item.key ?? index;
        const labelEl: DomphyElement =
          typeof item.label === "string"
            ? ({ span: item.label } as DomphyElement<"span">)
            : item.label;

        return {
          button: [labelEl],
          _key: key,
          type: "button",
          role: "tab",
          id: `tab${id}${key}`,
          ariaControls: `panel${id}${key}`,
          ariaSelected: (l: Listener) => activeKey.get(l) === key,
          onClick: () => activeKey.set(key),
          onKeyDown: (e: Event) => {
            const k = (e as KeyboardEvent).key;
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) return;
            e.preventDefault();
            const keys = items.map((it, i) => it.key ?? i);
            const idx = keys.indexOf(key);
            let next = idx;
            if (k === "ArrowRight") next = (idx + 1) % keys.length;
            else if (k === "ArrowLeft")
              next = (idx - 1 + keys.length) % keys.length;
            else if (k === "Home") next = 0;
            else if (k === "End") next = keys.length - 1;
            activeKey.set(keys[next]);
          },
          style: {
            cursor: "pointer",
            fontSize: (l: Listener) => themeSize(l, "inherit"),
            height: (l: Listener) => themeSpacing(6 + themeDensity(l) * 2),
            paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
            border: "none",
            outline: "none",
            // Resting tabs: shift-13 for ≥4.5:1 on surface (catalog low-contrast).
            color: (l: Listener) => themeColor(l, "shift-13"),
            backgroundColor: (l: Listener) => themeColor(l, "inherit"),
            boxShadow: (l: Listener) =>
              `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(l, "shift-1", color)}`,
            transition: "box-shadow 140ms ease, color 140ms ease",
            "&:hover:not([disabled]):not([aria-selected=true])": {
              color: (l: Listener) => themeColor(l, "shift-13"),
              boxShadow: (l: Listener) =>
                `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(l, "shift-2", color)}`,
            },
            "&[aria-selected=true]:not([disabled])": {
              color: (l: Listener) => themeColor(l, "shift-13", accentColor),
              boxShadow: (l: Listener) =>
                `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(l, "shift-8", accentColor)}`,
            },
            // Focus ring must compose with the selected underline (both use
            // box-shadow) so keyboard focus doesn't erase the active indicator.
            "&:focus-visible": {
              boxShadow: (l: Listener) => focusRing(l, accentColor),
            },
            "&[aria-selected=true]:focus-visible": {
              boxShadow: (l: Listener) =>
                `${focusRing(l, accentColor)}, inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(l, "shift-6", accentColor)}`,
            },
          },
        } as DomphyElement<"button">;
      });

      const tablist: DomphyElement<"div"> = {
        div: buttons,
        role: "tablist",
        ariaOrientation: "horizontal",
        style: { display: "flex" },
      } as DomphyElement<"div">;

      const panels: DomphyElement<"div">[] = items.map((item, index) => {
        const key = item.key ?? index;
        return {
          div: [item.content],
          _key: key,
          role: "tabpanel",
          id: `panel${id}${key}`,
          ariaLabelledby: `tab${id}${key}`,
          hidden: (l: Listener) => activeKey.get(l) !== key,
          style: {
            paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
            paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          },
        } as DomphyElement<"div">;
      });

      // Inject generated structure into the host element's children slot.
      (element as any)[node.tagName] = [tablist, ...panels];
    },
  };
}

export { tabs };
export type { TabItem };
