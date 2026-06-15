import { type ElementNode, merge, type PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

/**
 * Styles a tab panel inside a `tabs` tablist. Wires up the panel's
 * id/aria-labelledby and toggles `hidden` based on the surrounding `tabs`
 * context's active key. Must be used inside a `tabs` patch. Takes no props.
 *
 * @hostTag div
 * @example { div: "Panel content", $: [tabPanel()] }
 */
function tabPanel(): PartialElement {
  const partial: PartialElement = {
    role: "tabpanel",
    style: {
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
    },
    _onInsert: (node) => {
      const context = node.getContext("tabs");
      if (!context) {
        console.warn(`"tabPanel" patch must be used inside a "tabs"`);
        return;
      }
      let children = (node.parent?.children.items ?? []) as ElementNode[];
      children = children.filter(
        (n) =>
          n.type == "ElementNode" && n.attributes.get("role") == "tabpanel",
      );
      const key =
        node.key !== null && node.key !== undefined
          ? node.key
          : children.findIndex((n) => n == node);
      const part: PartialElement = {
        id: "tabpanel" + node.parent!.nodeId + key,
        ariaLabelledby: "tab" + node.parent!.nodeId + key,
        hidden: (listener) => context.activeKey.get(listener) != key,
      };
      node.merge(part);
    },
  };
  return partial;
}

export { tabPanel };
