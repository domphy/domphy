import { PartialElement, ElementNode, merge } from "@domphy/core";
import { themeSpacing, themeDensity, themeColor } from "@domphy/theme";

function tabPanel(): PartialElement {
  let partial: PartialElement = {
    role: "tabpanel",
    style: {
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
    },
    _onInsert: (node) => {
      let context = node.getContext("tabs")
      if (!context) {
        console.warn(`"tabPanel" patch must be used inside a "tabs"`);
        return;
      }
      let children = (node.parent?.children.items ?? []) as ElementNode[]
      children = children.filter(n => n.type == "ElementNode" && n.attributes.get("role") == "tabpanel")
      let key = node.key !== null && node.key !== undefined ? node.key : children.findIndex(n => n == node)
      let part: PartialElement = {
        id: "tabpanel" + node.parent!.nodeId + key,
        "ariaLabelledby": "tab" + node.parent!.nodeId + key,
        "hidden": (listener) => context.activeKey.get(listener) != key,
      }
      node.merge(part)
    },
  };
  return partial;
}



export { tabPanel };
