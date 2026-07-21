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
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/** One step entry. */
type StepItem = {
  /** Step label — plain string (auto-wrapped) or any DomphyElement. */
  label: string | DomphyElement;
  /** Stable key. Defaults to the item's zero-based index. */
  key?: string | number;
};

/**
 * All-in-one step-progress indicator. Generates `<li>` step elements from the
 * `items` array. Apply to an `<ol>` or `<ul>` element.
 *
 * @param props.items - Step definitions `{ label, key? }`.
 * @param props.current - Zero-based index of the active step (value or State). Defaults to `0`.
 * @param props.direction - `"horizontal"` (default) or `"vertical"` layout.
 * @param props.color - Theme color for pending/track elements. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for active/completed elements. Defaults to `"primary"`.
 * @example
 * { ol: null, $: [steps({ current: 1, items: [
 *   { label: "Cart" },
 *   { label: "Shipping" },
 *   { label: "Payment" },
 * ] })] }
 */
function steps(
  props: {
    items: StepItem[];
    current?: ValueOrState<number>;
    direction?: "horizontal" | "vertical";
    color?: ThemeColor;
    accentColor?: ThemeColor;
  } = { items: [] },
): PartialElement {
  const {
    items = [],
    direction = "horizontal",
    color = "neutral",
    accentColor = "primary",
  } = props;
  const current = toState(props.current ?? 0);

  return {
    // Step badge weight is design-system chrome for the progress control.
    _doctorDisable: "inline-typography",
    // Expose state in context so stepItem() escape-hatch still works.
    _context: { steps: { current, direction, color, accentColor } },
    _onSchedule: (node, element) => {
      const stepEls: DomphyElement<"li">[] = items.map((item, index) => {
        const labelEl: DomphyElement =
          typeof item.label === "string"
            ? ({ span: item.label } as DomphyElement<"span">)
            : item.label;

        return {
          li: [labelEl],
          _key: item.key ?? index,
          dataStep: String(index + 1),
          dataStatus: (l: Listener) => {
            const cur = current.get(l);
            if (index < cur) return "done";
            if (index === cur) return "active";
            return "pending";
          },
          ariaCurrent: (l: Listener) =>
            current.get(l) === index ? "step" : undefined,
          style: {
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: themeSpacing(1),
            flex: "1",
            fontSize: (l: Listener) => themeSize(l, "decrease-1"),
            textAlign: "center",
            "&::before": {
              content: "attr(data-step)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: themeSpacing(6),
              height: themeSpacing(6),
              borderRadius: themeSpacing(999),
              fontSize: (l: Listener) => themeSize(l, "decrease-1"),
              fontWeight: "bold",
              flexShrink: "0",
              border: (l: Listener) =>
                `2px solid ${themeColor(l, "border-strong", color)}`,
              backgroundColor: (l: Listener) => themeColor(l, "inherit"),
              color: (l: Listener) => themeColor(l, "muted"),
              transition:
                "background-color 200ms ease, color 200ms ease, border-color 200ms ease",
              zIndex: "1",
            },
            "&:not(:first-child)::after": {
              content: '""',
              position: "absolute",
              top: themeSpacing(3),
              right: `calc(50% + ${themeSpacing(3)})`,
              left: `calc(-50% + ${themeSpacing(3)})`,
              height: "2px",
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", color),
              zIndex: "0",
            },
            "&[data-status=active]::before": {
              backgroundColor: (l: Listener) =>
                themeColor(l, "shift-6", accentColor),
              borderColor: (l: Listener) =>
                themeColor(l, "shift-6", accentColor),
              color: (l: Listener) => themeColor(l, "shift-15", accentColor),
            },
            "&[data-status=done]::before": {
              content: '"✓"',
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", color),
              borderColor: (l: Listener) => themeColor(l, "border", color),
              color: (l: Listener) => themeColor(l, "text", color),
            },
            "&[data-status=done]:not(:first-child)::after": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", color),
            },
            "&[data-status=active]:not(:first-child)::after": {
              backgroundColor: (l: Listener) =>
                themeColor(l, "shift-6", accentColor),
            },
            "&[data-status=pending]": {
              color: (l: Listener) => themeColor(l, "shift-7"),
            },
            "&[data-status=active]": {
              color: (l: Listener) => themeColor(l, "shift-10"),
              fontWeight: "bold",
            },
            "&[data-status=done]": {
              color: (l: Listener) => themeColor(l, "muted"),
            },
          },
        } as DomphyElement<"li">;
      });

      (element as any)[node.tagName] = stepEls;
    },
    style: {
      display: "flex",
      flexDirection: direction === "vertical" ? "column" : "row",
      alignItems: direction === "vertical" ? "flex-start" : "center",
      gap: themeSpacing(2),
      listStyle: "none",
      margin: "0",
      padding: "0",
    },
  };
}

export { steps };
export type { StepItem };
