import {
  type DomphyElement,
  merge,
  type PartialElement,
  type StyleObject,
  toState,
  type ValueOrState,
} from "@domphy/core";
import type { Placement } from "@domphy/floating";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { creatFloating } from "../utils/floating.js";
import { tag } from "./tag.js";

/**
 * A clickable select trigger box that renders the currently selected option(s) as removable
 * tags and toggles a floating popover (the dropdown content) anchored to itself. Selected
 * labels are derived from `options` matching the bound `value`; removing a tag updates the value.
 *
 * @hostTag div
 * @param props.multiple - Whether multiple selection is allowed (renders removable tags and
 *   keeps the popover open on click). Defaults to `false`.
 * @param props.value - Bound selection value(s). Accepts a value or reactive state of an array of
 *   `number | string | null | undefined`, or a single `number | string | null | undefined`.
 * @param props.options - List of `{ label, value }` options used to resolve selected labels.
 *   Defaults to `[]`.
 * @param props.placement - Floating placement of the dropdown popover. Accepts a value or
 *   reactive state. Defaults to `"bottom"`.
 * @param props.content - Required. The popover/dropdown content element shown when open.
 * @param props.color - Theme color tone for the box text/background. Defaults to `"neutral"`.
 * @param props.open - Whether the popover is open. Accepts a value or reactive state. Defaults to `false`.
 * @example { div: null, $: [selectBox({ content: { div: [...] }, options: [{ label: "A", value: "a" }] })] }
 */
function selectBox(props: {
  multiple?: boolean;
  value?: ValueOrState<
    | Array<number | string | null | undefined>
    | number
    | string
    | null
    | undefined
  >;
  options?: Array<{ label: string; value: string }>;
  placement?: ValueOrState<Placement>;
  content: DomphyElement;
  color?: ThemeColor;
  open?: ValueOrState<boolean>;
}): PartialElement {
  const {
    options = [],
    placement = "bottom",
    color = "neutral",
    open = false,
    multiple = false,
  } = props;

  const state = toState(props.value);
  const openState = toState(open);
  const { show, hide, anchorPartial } = creatFloating({
    open: openState,
    placement: toState(placement),
    content: props.content,
  });

  const popoverPartial: PartialElement = {
    onClick: () => !multiple && hide(),
  };

  merge(props.content, popoverPartial);

  const wrap: DomphyElement<"div"> = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      const opts = options.filter((opt) => vals.includes(opt.value));
      return opts.map((opt) => ({
        span: opt.label,
        $: [tag({ color, removable: multiple })],
        _key: opt.value,
        _onRemove: (_node) => {
          const cur = state.get();
          const curVals = Array.isArray(cur) ? cur : [cur];
          const filter = curVals.filter((v) => v !== opt.value);
          multiple ? state.set(filter as any) : state.set(filter[0] as any);
        },
      })) as DomphyElement<"span">[];
    },
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(1),
      flex: 1,
    } as StyleObject,
  };

  const partial: PartialElement = {
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"selectBox" patch must use div tag`);
      }
    },
    _onInit: (node) => node.children.insert(wrap),
    onClick: () => (openState.get() ? hide() : show()),
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      minHeight: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      minWidth: themeSpacing(32),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
    },
  };

  merge(anchorPartial, partial);
  return anchorPartial;
}

export { selectBox };
