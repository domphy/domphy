import { PartialElement, ElementNode } from "@domphy/core";
import { themeSpacing, ThemeColor, themeColor, themeDensity, themeSize } from "@domphy/theme";

function tab(props: {
  accentColor?: ThemeColor;
  color?: ThemeColor;
} = {}): PartialElement {
  const {
    accentColor = "primary",
    color = "neutral",
  } = props;
  let partial: PartialElement = {
    role: "tab",
    _onInsert: (node) => {

      if (node.tagName != "button") {
        console.warn(`"tab" patch must use button tag`);
      }

      let context = node.getContext("tabs")
      let children = node.parent?.children.items as ElementNode[]
      children = children.filter(n => n.type == "ElementNode" && n.attributes.get("role") == "tab")
      let key = node.key || children.findIndex(n => n == node)

      let part: PartialElement = {
        id: "tab" + node.parent!.nodeId + key,
        "ariaControls": "tabpanel" + node.parent!.nodeId + key,
        "ariaSelected": (listener) => context.activeKey.get(listener) == key,
        onClick: () => context.activeKey.set(key),
        onKeyDown: (e: Event) => {
          const k = (e as KeyboardEvent).key;
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) return;
          e.preventDefault();
          const tabs = (node.parent?.children.items ?? []).filter(
            n => n.type === "ElementNode" && (n as ElementNode).attributes.get("role") === "tab"
          ) as ElementNode[];
          const idx = tabs.findIndex(n => n === node);
          let next = idx;
          if (k === "ArrowRight") next = (idx + 1) % tabs.length;
          else if (k === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
          else if (k === "Home") next = 0;
          else if (k === "End") next = tabs.length - 1;
          const target = tabs[next];
          context.activeKey.set(target.key ?? next);
          (target.domElement as HTMLElement)?.focus();
        },
      }
      node.merge(part)
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
      boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-1", color)}`,
      "&:hover:not([disabled])": {
        boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-2", color)}`,
      },
      "&[aria-selected=true]:not([disabled])": {
        boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-6", accentColor)}`,
      },
      "&:focus-visible": {
        boxShadow: (listener) => `inset 0 -${themeSpacing(0.5)} 0 0 ${themeColor(listener, "shift-6", accentColor)}`,

      },
    },
  }
  return partial
}


export { tab };
