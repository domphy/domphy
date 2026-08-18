import {
  behavior,
  type DomphyElement,
  type ElementNode,
  isState,
  type Listener,
  type PartialElement,
  type State,
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

type StepsLive = {
  items: StepItem[];
  direction: "horizontal" | "vertical";
  color: ThemeColor;
  accentColor: ThemeColor;
};

function persistValue<T>(
  node: ElementNode,
  key: string,
  incoming: ValueOrState<T> | undefined,
  fallback: T,
): State<T> {
  if (isState(incoming)) {
    node.setMetadata(key, incoming);
    return incoming as State<T>;
  }
  let stored = node.getMetadata(key) as State<T> | undefined;
  if (!stored) {
    stored = toState((incoming as T | undefined) ?? fallback);
    node.setMetadata(key, stored);
  }
  return stored;
}

function stepConnectorStyle(
  direction: "horizontal" | "vertical",
  color: ThemeColor,
  accentColor: ThemeColor,
) {
  if (direction === "vertical") {
    // Outgoing track: from this badge's bottom through the host gap to the
    // next badge. Incoming-from-current-item cannot span the previous
    // item's variable label height.
    return {
      "&:not(:last-child)::after": {
        content: '""',
        position: "absolute",
        left: themeSpacing(3),
        top: themeSpacing(6),
        bottom: `-${themeSpacing(2)}`,
        width: "2px",
        height: "auto",
        right: "auto",
        backgroundColor: (l: Listener) => themeColor(l, "shift-3", color),
        zIndex: "0",
      },
      "&[data-status=done]:not(:last-child)::after": {
        backgroundColor: (l: Listener) => themeColor(l, "shift-9", accentColor),
      },
    };
  }
  return {
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
    "&[data-status=done]:not(:first-child)::after": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-9", accentColor),
    },
    "&[data-status=active]:not(:first-child)::after": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-9", accentColor),
    },
  };
}

function buildStepItems(
  items: StepItem[],
  current: State<number>,
  direction: "horizontal" | "vertical",
  color: ThemeColor,
  accentColor: ThemeColor,
): DomphyElement<"li">[] {
  const vertical = direction === "vertical";
  const connector = stepConnectorStyle(direction, color, accentColor);

  return items.map((item, index) => {
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
        flexDirection: vertical ? "row" : "column",
        alignItems: vertical ? "flex-start" : "center",
        gap: themeSpacing(1),
        flex: vertical ? "none" : "1",
        fontSize: (l: Listener) => themeSize(l, "decrease-1"),
        textAlign: vertical ? "left" : "center",
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
        ...connector,
        "&[data-status=active]::before": {
          backgroundColor: (l: Listener) =>
            themeColor(l, "shift-9", accentColor),
          borderColor: (l: Listener) => themeColor(l, "shift-9", accentColor),
          color: (l: Listener) => themeColor(l, "shift-0", accentColor),
          boxShadow: (l: Listener) =>
            `0 0 0 3px ${themeColor(l, "shift-3", accentColor)}`,
        },
        // Completed steps: filled accent + check, matching active track.
        "&[data-status=done]::before": {
          content: '"✓"',
          backgroundColor: (l: Listener) =>
            themeColor(l, "shift-9", accentColor),
          borderColor: (l: Listener) => themeColor(l, "shift-9", accentColor),
          color: (l: Listener) => themeColor(l, "shift-0", accentColor),
        },
        "&[data-status=pending]": {
          color: (l: Listener) => themeColor(l, "muted"),
        },
        "&[data-status=active]": {
          color: (l: Listener) => themeColor(l, "shift-11", accentColor),
          fontWeight: "bold",
        },
        "&[data-status=done]": {
          color: (l: Listener) => themeColor(l, "text", color),
        },
      },
    } as DomphyElement<"li">;
  });
}

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
  const live: StepsLive = { items, direction, color, accentColor };

  return {
    // Step badge weight is design-system chrome for the progress control.
    _doctorDisable: "inline-typography",
    // Publish current/direction/colors so descendants can read the indicator.
    _context: {
      steps: {
        current: toState(props.current ?? 0),
        direction,
        color,
        accentColor,
      },
    },
    _onSchedule: (node, element) => {
      const current = persistValue(node, "stepsCurrent", props.current, 0);
      (element as Record<string, unknown>)[node.tagName] = buildStepItems(
        items,
        current,
        direction,
        color,
        accentColor,
      );
    },
    ...behavior<StepsLive>(
      "steps-items",
      (node) => ({
        update(snapshot) {
          const current = persistValue(node, "stepsCurrent", props.current, 0);
          node.children.update(
            buildStepItems(
              snapshot.items,
              current,
              snapshot.direction,
              snapshot.color,
              snapshot.accentColor,
            ),
            !!node.domElement,
            true,
          );
        },
      }),
      live,
    ),
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
