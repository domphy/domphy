import {
  type DomphyElement,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Container for a list of `selectItem`s that owns the selection state. It exposes a `select`
 * context (`{ value, multiple }`) consumed by child items, and injects hidden `<input>`(s)
 * carrying the selected value(s) under `name` for form submission.
 *
 * @hostTag div
 * @param props.multiple - Whether multiple selection is allowed; also sets the default empty
 *   value (`[]` vs `null`). Defaults to `false`.
 * @param props.value - Bound selection value(s). Accepts a value or reactive state of an array of
 *   `number | string | null`, or a single `number | string | null`. Defaults to `[]` when
 *   `multiple`, otherwise `null`.
 * @param props.color - Theme color tone for the background. Defaults to `"neutral"`.
 * @param props.name - Name attribute for the hidden inputs (form field name).
 * @example { div: [{ div: "A", $: [selectItem({ value: "a" })] }], $: [selectList({ name: "pick" })] }
 */
function selectList(
  props: {
    multiple?: boolean;
    value?: ValueOrState<
      Array<number | string | null> | number | string | null
    >;
    color?: ThemeColor;
    name?: string;
  } = {},
): PartialElement {
  const { color = "neutral", multiple = false } = props;
  const state = toState(props.value ?? (multiple ? [] : null));

  const inputs: DomphyElement<"div"> = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      return vals.map((v) => ({
        input: null,
        name: props.name,
        // Preserve a legitimate numeric 0 (and other falsy-but-valid values);
        // `v || ""` would drop them.
        value: v == null ? "" : String(v),
      }));
    },
    hidden: true,
  };

  const partial: PartialElement = {
    dataTone: "shift-17",
    _context: {
      select: {
        value: state,
        multiple,
      },
    },
    _onInit: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"selectList" patch must use a div tag`);
      }
      node.children.insert(inputs);
    },
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
    },
  };
  return partial;
}

export { selectList };
