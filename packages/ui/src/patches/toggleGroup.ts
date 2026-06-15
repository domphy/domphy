import {
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
 * Container patch that establishes a `toggleGroup` context (shared selection
 * `value` + `multiple` flag) and `group` role for child `toggle` patches, with
 * a bordered segmented-control style. No host tag check; typically applied to a
 * wrapper element.
 *
 * @param props.value - Selected toggle key(s). Optional, accepts a value or state of `string | string[]`. Defaults to `[]` when `multiple`, otherwise `""`.
 * @param props.multiple - When true, allows multiple toggles selected at once. Optional. Defaults to `false`.
 * @param props.color - Theme color for the group background/border. Optional. Defaults to `"neutral"`.
 * @example { div: null, $: [toggleGroup({ multiple: true })] }
 */
function toggleGroup(
  props: {
    value?: ValueOrState<string | string[]>;
    multiple?: boolean;
    color?: ThemeColor;
  } = {},
): PartialElement {
  const { multiple = false, color = "neutral" } = props;
  return {
    role: "group",
    _context: {
      toggleGroup: {
        value: toState(props.value ?? (multiple ? [] : "")),
        multiple,
      },
    },
    style: {
      display: "flex",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(1),
      gap: themeSpacing(1),
      borderRadius: themeSpacing(2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-3", color)}`,
      outlineOffset: "-1px",
    },
  };
}

export { toggleGroup };
