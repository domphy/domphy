import type { DomphyElement, PartialElement } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

const xSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.707 5.293l5.293 5.292l5.293 -5.292a1 1 0 0 1 1.414 1.414l-5.292 5.293l5.292 5.293a1 1 0 0 1 -1.414 1.414l-5.293 -5.292l-5.293 5.292a1 1 0 1 1 -1.414 -1.414l5.292 -5.293l-5.292 -5.293a1 1 0 0 1 1.414 -1.414" /></svg>`;

/**
 * Styles an inline chip/tag (rounded, bordered, optional remove button).
 * No host tag check; typically applied to a `<span>`. When `removable` is true,
 * a close button is inserted that removes the host node on click.
 *
 * @hostTag span
 * @param props.color - Theme color for the chip background/border/text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @param props.removable - When true, renders a remove (x) button that removes the tag on click. Optional. Defaults to `false`.
 * @example { span: "Label", $: [tag({ removable: true })] }
 */
function tag(
  props: { color?: ValueOrState<ThemeColor>; removable?: boolean } = {},
): PartialElement {
  const { removable = false } = props;
  const color = toState(props.color ?? "neutral", "color");

  return {
    dataTone: "shift-2",
    _onInit: (node) => {
      const removeBtn: DomphyElement<"span"> = {
        span: xSvg,
        onClick: (e) => {
          (e as Event).stopPropagation();
          node.remove();
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          borderRadius: themeSpacing(1),
          width: themeSpacing(4),
          height: themeSpacing(4),
          flexShrink: 0,
          "&:hover": {
            backgroundColor: (listener) =>
              themeColor(listener, "shift-4", color.get(listener)),
          },
        },
      };

      removable && node.children.insert(removeBtn);
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      userSelect: "none",
      height: themeSpacing(6),
      paddingBlock: "0px",
      borderRadius: themeSpacing(1),
      paddingInlineStart: themeSpacing(2),
      paddingInlineEnd: removable ? themeSpacing(1) : themeSpacing(2),
      gap: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
    },
  };
}

export { tag };
