import { type ElementNode, type PartialElement, type State } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Styles a single step inside a `steps` container. Sets `data-status`
 * (`"pending"` | `"active"` | `"done"`) and `aria-current="step"` on the host element
 * based on the parent `steps` context. The element's content is the step label.
 *
 * @example { li: "Shipping", $: [stepItem()] }
 */
function stepItem(): PartialElement {
  return {
    _onInsert: (node) => {
      const context = node.getContext("steps") as
        | {
            current: State<number>;
            direction: "horizontal" | "vertical";
            color: ThemeColor;
            accentColor: ThemeColor;
          }
        | undefined;

      if (!context) {
        console.warn(`"stepItem" patch must be used inside a "steps"`);
        return;
      }

      const siblings = (node.parent?.children.items ?? []) as ElementNode[];
      const items = siblings.filter((n) => n.type === "ElementNode");
      const index = items.indexOf(node);

      if (node.domElement) node.domElement.dataset.step = String(index + 1);

      node.attributes.set("dataStatus", (listener) => {
        const current = context.current.get(listener);
        if (index < current) return "done";
        if (index === current) return "active";
        return "pending";
      });

      node.attributes.set("ariaCurrent", (listener) => {
        return context.current.get(listener) === index ? "step" : undefined;
      });
    },
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: themeSpacing(1),
      flex: "1",
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      textAlign: "center",
      // Circle indicator via ::before using data-step content
      "&::before": {
        content: "attr(data-step)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: themeSpacing(6),
        height: themeSpacing(6),
        borderRadius: themeSpacing(999),
        fontSize: (listener) => themeSize(listener, "decrease-1"),
        fontWeight: "600",
        flexShrink: "0",
        border: (listener) =>
          `2px solid ${themeColor(listener, "shift-4", "neutral")}`,
        backgroundColor: (listener) => themeColor(listener, "inherit"),
        color: (listener) => themeColor(listener, "shift-8"),
        transition: "background-color 200ms ease, color 200ms ease, border-color 200ms ease",
        zIndex: "1",
      },
      // Connector line to the previous sibling — shown on non-first items
      "&:not(:first-child)::after": {
        content: '""',
        position: "absolute",
        top: themeSpacing(3),
        right: `calc(50% + ${themeSpacing(3)})`,
        left: `calc(-50% + ${themeSpacing(3)})`,
        height: "2px",
        backgroundColor: (listener) => themeColor(listener, "shift-3", "neutral"),
        zIndex: "0",
      },
      // Active step — accent colored filled circle
      "&[data-status=active]::before": {
        backgroundColor: (listener) => themeColor(listener, "shift-6", "primary"),
        borderColor: (listener) => themeColor(listener, "shift-6", "primary"),
        color: (listener) => themeColor(listener, "shift-15", "primary"),
      },
      // Done step — muted filled circle with checkmark
      "&[data-status=done]::before": {
        content: '"✓"',
        backgroundColor: (listener) => themeColor(listener, "shift-3", "neutral"),
        borderColor: (listener) => themeColor(listener, "shift-3", "neutral"),
        color: (listener) => themeColor(listener, "shift-9", "neutral"),
      },
      // Done step connector — filled track
      "&[data-status=done]:not(:first-child)::after": {
        backgroundColor: (listener) => themeColor(listener, "shift-3", "neutral"),
      },
      // Active step connector — accent track up to the active item
      "&[data-status=active]:not(:first-child)::after": {
        backgroundColor: (listener) => themeColor(listener, "shift-6", "primary"),
      },
      // Pending text — muted
      "&[data-status=pending]": {
        color: (listener) => themeColor(listener, "shift-7"),
      },
      // Active text — default emphasis
      "&[data-status=active]": {
        color: (listener) => themeColor(listener, "shift-10"),
        fontWeight: "600",
      },
      // Done text — secondary
      "&[data-status=done]": {
        color: (listener) => themeColor(listener, "shift-8"),
      },
    },
  };
}

export { stepItem };
