import { PartialElement, ElementNode } from "@domphy/core";
import { themeSpacing, ThemeColor, themeColor, themeSize } from "@domphy/theme";

function menuItem(props: {
  accentColor?: ThemeColor;
  color?: ThemeColor;
} = {}): PartialElement {
  const {
    accentColor = "primary",
    color = "neutral",
  } = props;

  let partial: PartialElement = {
    role: "menuitem",
    _onInsert: (node) => {
      if (node.tagName != "button") {
        console.warn(`"menuItem" patch must use button tag`);
      }

      let context = node.getContext("menu");
      let children = node.parent?.children.items as ElementNode[];
      children = children.filter(n => n.type == "ElementNode" && n.attributes.get("role") == "menuitem");
      let key = node.key || children.findIndex(n => n == node);
      node.attributes.set("ariaCurrent", (listener) => context.activeKey.get(listener) == key || undefined)
      node.addEvent("click", () => context.activeKey.set(key))
      node.addEvent("keydown", (e: Event) => {
        const k = (e as KeyboardEvent).key;
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(k)) return;
        e.preventDefault();
        const items = (node.parent?.children.items ?? []).filter(
          n => n.type === "ElementNode" && (n as ElementNode).attributes.get("role") === "menuitem"
        ) as ElementNode[];
        const idx = items.findIndex(n => n === node);
        let next = idx;
        if (k === "ArrowDown") next = (idx + 1) % items.length;
        else if (k === "ArrowUp") next = (idx - 1 + items.length) % items.length;
        else if (k === "Home") next = 0;
        else if (k === "End") next = items.length - 1;
        (items[next].domElement as HTMLElement)?.focus();
      })

    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      width: "100%",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(8),
      paddingInline: themeSpacing(3),
      border: "none",
      outline: "none",
      color: (listener) => themeColor(listener, "shift-6"),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      "&:hover:not([disabled]):not([aria-current=true])": {
        backgroundColor: (listener) => themeColor(listener, "shift-1"),
      },
      "&[aria-current=true]": {
        backgroundColor: (listener) => themeColor(listener, "shift-1", accentColor),
        color: (listener) => themeColor(listener, "shift-7"),
      },
      "&:focus-visible": {
        outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`,
      },
    },
  };
  return partial;
}

export { menuItem };
