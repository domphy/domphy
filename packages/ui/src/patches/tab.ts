import type { ElementNode, PartialElement } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Low-level tab trigger patch. Prefer the all-in-one `tabs({ items })` patch for
 * typical use — it generates buttons and panels automatically with correct ARIA wiring.
 *
 * Use `tab()` only when you need full control over the button element (custom markup,
 * extra patches). Must be a **direct child** of the `tabs()` container element,
 * alongside all `tabPanel()` panels. The `_key` prop must match the corresponding panel.
 *
 * @hostTag button
 * @param props.accentColor - Theme color for the active/focus underline. Defaults to `"primary"`.
 * @param props.color - Theme color for the resting/hover underline and text. Defaults to `"neutral"`.
 * @example { button: "Tab 1", $: [tab()], _key: "tab1" }
 */
function tab(
  props: { accentColor?: ThemeColor; color?: ThemeColor } = {},
): PartialElement {
  const { accentColor = "primary", color = "neutral" } = props;
  const partial: PartialElement = {
    role: "tab",
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"tab" patch must use button tag`);
      }

      const context = node.getContext("tabs");
      if (!context) {
        console.warn(`"tab" patch must be used inside a "tabs"`);
        return;
      }
      let children = (node.parent?.children.items ?? []) as ElementNode[];
      children = children.filter(
        (n) => n.type === "ElementNode" && n.attributes.get("role") === "tab",
      );
      const key =
        node.key !== null && node.key !== undefined
          ? node.key
          : children.indexOf(node);

      const part: PartialElement = {
        id: `tab${node.parent!.nodeId}${key}`,
        ariaControls: `tabpanel${node.parent!.nodeId}${key}`,
        ariaSelected: (listener) => context.activeKey.get(listener) === key,
        onClick: () => context.activeKey.set(key),
        onKeyDown: (e: Event) => {
          const k = (e as KeyboardEvent).key;
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) return;
          e.preventDefault();
          const tabs = (node.parent?.children.items ?? []).filter(
            (n) =>
              n.type === "ElementNode" &&
              (n as ElementNode).attributes.get("role") === "tab",
          ) as ElementNode[];
          if (!tabs.length) return;
          const idx = tabs.indexOf(node);
          let next = idx;
          if (k === "ArrowRight") next = (idx + 1) % tabs.length;
          else if (k === "ArrowLeft")
            next = (idx - 1 + tabs.length) % tabs.length;
          else if (k === "Home") next = 0;
          else if (k === "End") next = tabs.length - 1;
          const target = tabs[next];
          context.activeKey.set(target.key ?? next);
          (target.domElement as HTMLElement)?.focus();
        },
      };
      node.merge(part);
    },
    style: {
      cursor: "pointer",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-9"),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      boxShadow: (listener) =>
        `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-1", color)}`,
      "&:hover:not([disabled])": {
        boxShadow: (listener) =>
          `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-2", color)}`,
      },
      "&[aria-selected=true]:not([disabled])": {
        boxShadow: (listener) =>
          `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-6", accentColor)}`,
      },
      "&:focus-visible": {
        boxShadow: (listener) =>
          `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-6", accentColor)}`,
      },
    },
  };
  return partial;
}

export { tab };
