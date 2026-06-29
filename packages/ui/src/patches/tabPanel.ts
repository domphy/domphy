import type { ElementNode, PartialElement } from "@domphy/core";
import { themeDensity, themeSpacing } from "@domphy/theme";

/**
 * Low-level tab panel patch. Prefer the all-in-one `tabs({ items })` patch for
 * typical use — it generates buttons and panels automatically with correct ARIA wiring.
 *
 * Use `tabPanel()` only when you need full control over the panel element. Must be a
 * **direct child** of the `tabs()` container element, alongside all `tab()` buttons.
 * The `_key` prop must match the corresponding tab button.
 *
 * @hostTag div
 * @example { div: "Panel content", $: [tabPanel()], _key: "tab1" }
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
          n.type === "ElementNode" && n.attributes.get("role") === "tabpanel",
      );
      const key =
        node.key !== null && node.key !== undefined
          ? node.key
          : children.indexOf(node);
      const part: PartialElement = {
        id: `tabpanel${node.parent!.nodeId}${key}`,
        ariaLabelledby: `tab${node.parent!.nodeId}${key}`,
        hidden: (listener) => context.activeKey.get(listener) !== key,
      };
      node.merge(part);
    },
  };
  return partial;
}

export { tabPanel };
