import {
  type ElementNode,
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

/**
 * Styles and wires a single option inside a `segmented` control on the host `<button>`.
 * Sets `aria-checked` and handles click-to-select against the parent `segmented` context.
 *
 * @hostTag button
 * @param props.color - Theme color for resting state. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for selected state. Defaults to `"primary"`.
 * @example { button: "Month", $: [segmentedItem()] }
 */
function segmentedItem(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");
  return {
    role: "radio",
    _onInsert: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"segmentedItem" patch must use button tag`);
      }
      const ctx = node.getContext("segmented");
      if (!ctx) {
        console.warn(`"segmentedItem" patch must be used inside a "segmented"`);
        return;
      }
      const siblings = (node.parent?.children.items ?? []) as ElementNode[];
      const items = siblings.filter(
        (sibling) =>
          sibling.type === "ElementNode" &&
          sibling.attributes.get("role") === "radio",
      );
      // node.key is null (not undefined) when absent — check both so an
      // explicit _key of 0 or "" keeps its real key instead of "null"/index.
      const key =
        node.key !== null && node.key !== undefined
          ? String(node.key)
          : String(items.indexOf(node));

      node.attributes.set(
        "ariaChecked",
        (listener) => ctx.value.get(listener) === key,
      );

      node.addEvent("click", () => ctx.value.set(key));
    },
    style: {
      cursor: "pointer",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: themeSpacing(6),
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(3),
      border: "none",
      borderRadius: themeSpacing(10),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      backgroundColor: "transparent",
      transition: "background-color 300ms ease",
      "&:hover:not([disabled]):not([aria-checked=true])": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-3", color.get(listener)),
      },
      "&[aria-checked=true]": {
        backgroundColor: (listener) =>
          themeColor(listener, "shift-0", accentColor.get(listener)),
        color: (listener) =>
          themeColor(listener, "shift-10", accentColor.get(listener)),
      },
      "&:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
        outlineOffset: `-${themeSpacing(0.5)}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
      },
    },
  };
}

export { segmentedItem };
