import type { ElementNode, PartialElement } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

function menuItem(
  props: { accentColor?: ThemeColor; color?: ThemeColor } = {},
): PartialElement {
  const { accentColor = "primary", color = "neutral" } = props;

  const partial: PartialElement = {
    role: "menuitem",
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"menuItem" patch must use button tag`);
      }

      const context = node.getContext("menu");
      if (!context) {
        console.warn(`"menuItem" patch must be used inside a "menu"`);
        return;
      }
      let children = (node.parent?.children.items ?? []) as ElementNode[];
      children = children.filter(
        (n) =>
          n.type == "ElementNode" && n.attributes.get("role") == "menuitem",
      );
      // Strict key check: an explicit _key of 0 or "" must not fall back to index.
      const key =
        node.key !== null && node.key !== undefined
          ? node.key
          : children.findIndex((n) => n == node);
      if (context.selectable) {
        node.attributes.set(
          "ariaCurrent",
          (listener) => context.activeKey.get(listener) == key || undefined,
        );
        node.addEvent("click", () => context.activeKey.set(key));
      }
    },
    onKeyDown: (e: KeyboardEvent, node) => {
      const k = (e as KeyboardEvent).key;
      if (k === "Enter" || k === " ") {
        e.preventDefault();
        (node.domElement as HTMLElement)?.click();
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(k)) return;
      e.preventDefault();
      const items = (node.parent?.children.items ?? []).filter(
        (n) =>
          n.type === "ElementNode" &&
          (n as ElementNode).attributes.get("role") === "menuitem",
      ) as ElementNode[];
      const idx = items.findIndex((n) => n === node);
      let next = idx;
      if (k === "ArrowDown") next = (idx + 1) % items.length;
      else if (k === "ArrowUp") next = (idx - 1 + items.length) % items.length;
      else if (k === "Home") next = 0;
      else if (k === "End") next = items.length - 1;
      (items[next].domElement as HTMLElement)?.focus();
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: (listener) => themeSpacing(2),
      width: "100%",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-9"),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      "&:hover:not([disabled]):not([aria-current=true])": {
        backgroundColor: (listener) => themeColor(listener, "shift-2"),
      },
      // Menu uses the current/indicator band instead of the selected fill band.
      "&[aria-current=true]": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", accentColor),
        color: (listener) => themeColor(listener, "shift-10"),
      },
      "&:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`,
      },
    },
  };
  return partial;
}

export { menuItem };
