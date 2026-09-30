import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Themed highlight primitive: gives marked/highlighted inline text a tinted
 * background, rounded corners and padding. Apply to a `<mark>` element.
 *
 * @hostTag mark
 * @param props - Optional configuration.
 * @param props.accentColor - Accent color tone for the highlight fill and text. Defaults to `"highlight"`.
 * @example { mark: "important", $: [mark()] }
 */
function mark(
  props: { accentColor?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const accentColor = toState(props.accentColor ?? "highlight", "accentColor");

  return {
    _onInsert: (node) => {
      if (node.tagName !== "mark") {
        console.warn(`"mark" primitive patch must use mark tag`);
      }
    },
    dataTone: "shift-2",
    style: {
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) =>
        themeColor(listener, "text", accentColor.get(listener)),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", accentColor.get(listener)),
      // A chip inside running text keeps its own compact line box: an inherited
      // line-height (1.8, say) would otherwise overflow the fixed height.
      lineHeight: "normal",
      // Bare themeSpacing(U) at snapshot time; n = U / 1.5 (light.densities[2]).
      // minHeight, not height: at a small density the chip must still grow to
      // its own line box rather than clip the text.
      minHeight: (listener) => themeSpacing(themeDensity(listener) * (6 / 1.5)),
      borderRadius: (listener) =>
        themeSpacing(themeDensity(listener) * (1 / 1.5)),
      paddingInline: (listener) =>
        themeSpacing(themeDensity(listener) * (1.5 / 1.5)),
    },
  };
}

export { mark };
