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
import { elevation } from "../utils/elevation.js";
import { createFloating } from "../utils/floating.js";
import { focusRing } from "../utils/focusRing.js";
import { tag } from "./tag.js";

/**
 * A combobox/multi-select control: renders selected options as removable tags
 * plus an input, and shows a floating popover (`content`) anchored to the host.
 * Apply to a `<div>` element.
 *
 * @hostTag div
 * @param props.multiple - Allow selecting multiple values (popover stays open on click). Optional `boolean`, default false.
 * @param props.value - Selected value(s). Optional `ValueOrState<Array<number | string | null | undefined> | number | string | null | undefined>`, no default.
 * @param props.options - Available `{ label, value }` options used to render selected tags. Optional `Array<{ label: string; value: string }>`, default `[]`.
 * @param props.placement - Floating popover placement. Optional `ValueOrState<Placement>`, default "bottom".
 * @param props.content - The floating popover content element. Required `DomphyElement`.
 * @param props.color - Color tone for the control. Optional `ThemeColor`, default "neutral".
 * @param props.open - Whether the popover is open. Optional `ValueOrState<boolean>`, default false.
 * @param props.input - Custom input element; when omitted a default `<input>` is created. Optional `DomphyElement`.
 * @example { div: null, $: [combobox({ options: [{ label: "A", value: "a" }], content: { div: null } })] }
 */
function combobox(props: {
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
  input?: DomphyElement;
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
  const { show, hide, anchorPartial } = createFloating({
    kind: "combobox",
    open: openState,
    placement: toState(placement),
    content: props.content,
  });

  const popoverPartial: PartialElement = {
    onClick: (_e, node) => !multiple && hide(node),
    dataTone: "shift-14",
    style: {
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong")}`,
      outlineOffset: "-1px",
      boxShadow: elevation("medium"),
    },
  };

  merge(props.content, popoverPartial);

  const inputStyle: StyleObject = {
    border: "none",
    outline: "none",
    padding: 0,
    margin: 0,
    flex: 1,
    height: themeSpacing(6),
    marginInlineStart: themeSpacing(2),
    fontSize: (listener: any) => themeSize(listener, "inherit"),
    color: (listener: any) => themeColor(listener, "text", color),
    backgroundColor: (listener: any) => themeColor(listener, "inherit", color),
  };

  let inputElement: DomphyElement;
  if (props.input) {
    const inputPartial: PartialElement = {
      onFocus: (_e, node) => show(node),
      style: inputStyle,
      _key: "combobox-input",
    };
    merge(props.input, inputPartial);
    inputElement = props.input;
  } else {
    inputElement = {
      input: null,
      onFocus: (_e, node) => show(node),
      value: (listener: any) => {
        state.get(listener);
        return "";
      },
      style: inputStyle,
      _key: "combobox-input",
    };
  }

  const wrap: DomphyElement<"div"> = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      const opts = options.filter((opt) => vals.includes(opt.value));
      const items: DomphyElement[] = opts.map((opt) => {
        return {
          span: opt.label,
          $: [tag({ color, removable: true })],
          _key: opt.value,
          _onRemove: (_node) => {
            const cur = state.get();
            const curVals = Array.isArray(cur) ? cur : [cur];
            const filter = curVals.filter((v) => v !== opt.value);
            multiple ? state.set(filter as any) : state.set(filter[0] as any);
          },
        };
      });
      items.push(inputElement);
      return items;
    },
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(1),
    },
  };

  const partial: PartialElement = {
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"combobox" primitive patch must use div tag`);
      }
    },
    _onInit: (node) => node.children.insert(wrap),
    style: {
      minWidth: themeSpacing(32),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      transition:
        "background-color 140ms ease, outline-color 140ms ease, box-shadow 140ms ease",
      "&:focus-within": {
        boxShadow: (listener) => focusRing(listener, color),
      },
    },
  };

  merge(anchorPartial, partial);
  return anchorPartial;
}

export { combobox };
