import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

/**
 * Styles a container as an empty-state placeholder: centered flex column with
 * muted coloring and comfortable padding. Provide the icon, title, and
 * description as child elements.
 *
 * @param props.color - Theme color tone for the muted text/icon. Defaults to `"neutral"`.
 * @example
 * { div: [
 *   { span: "📭", $: [heading({ level: 1 })] },
 *   { p: "No items yet", $: [paragraph()] },
 *   { span: "Add your first item to get started", $: [small()] },
 * ], $: [empty()] }
 */
function empty(
  props: { color?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(3),
      paddingBlock: themeSpacing(12),
      paddingInline: themeSpacing(6),
      textAlign: "center",
      color: (listener) => themeColor(listener, "shift-6", color.get(listener)),
      // First child (icon area): more muted color to visually recede behind the text
      "& > :first-child": {
        color: (listener) =>
          themeColor(listener, "shift-5", color.get(listener)),
      },
    },
  };
}

export { empty };
