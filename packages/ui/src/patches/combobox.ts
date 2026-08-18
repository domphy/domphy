import {
  type BehaviorInstance,
  behavior,
  type DomphyElement,
  type ElementNode,
  merge,
  type PartialElement,
  type State,
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
import { createFloating, floatingPanelId } from "../utils/floating.js";
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
      // Surface contract (dataTone-surface-contract): a tone-anchored panel
      // must declare BOTH background and text color — on the dark shift-14
      // surface, inherited portal context colors can fall below contrast.
      color: (listener) => themeColor(listener, "text"),
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

  type InnerProps = {
    options: Array<{ label: string; value: string }>;
    multiple: boolean;
    color: ThemeColor;
    state: State<
      | Array<number | string | null | undefined>
      | number
      | string
      | null
      | undefined
    >;
    input?: DomphyElement;
  };

  type ComboboxInner = BehaviorInstance<InnerProps> & {
    query: State<string>;
  };

  const readQuery = (listener?: { elementNode?: ElementNode }) =>
    listener?.elementNode?.getBehavior<ComboboxInner>("comboboxInner")?.query;

  const findComboboxAnchor = (from: ElementNode): ElementNode => {
    let current: ElementNode | null = from;
    while (current) {
      if (current._behaviorInstances.has("floating:combobox")) return current;
      current = current.parent;
    }
    return from;
  };

  const inputAria: PartialElement = {
    role: "combobox",
    ariaHaspopup: "listbox",
    ariaExpanded: (listener) => openState.get(listener),
    ariaControls: (listener) =>
      listener?.elementNode
        ? floatingPanelId(
            "combobox",
            findComboboxAnchor(listener.elementNode),
          )
        : undefined,
  };

  const buildInput = (custom?: DomphyElement): DomphyElement => {
    if (custom) {
      merge(custom, {
        onFocus: (_e: Event, node: ElementNode) => show(node),
        style: inputStyle,
        _key: "combobox-input",
        ...inputAria,
      });
      return custom;
    }
    return {
      input: null,
      // Accessible name for the filter field (critical for axe label rule).
      ariaLabel: "Filter options",
      onFocus: (_e: Event, node: ElementNode) => show(node),
      value: (listener: { elementNode?: ElementNode }) =>
        readQuery(listener)?.get(listener as never) ?? "",
      onInput: (event: Event, node: ElementNode) => {
        node
          .getBehavior<ComboboxInner>("comboboxInner")
          ?.query.set((event.target as HTMLInputElement).value);
      },
      style: inputStyle,
      _key: "combobox-input",
      ...inputAria,
    };
  };

  const buildWrap = (inner: InnerProps): DomphyElement<"div"> => ({
    div: (listener) => {
      openState.get(listener);
      const val = inner.state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      const opts = inner.options.filter((opt) => vals.includes(opt.value));
      const items: DomphyElement[] = opts.map((opt) => {
        return {
          span: opt.label,
          $: [tag({ color: inner.color, removable: true })],
          _key: opt.value,
          _onRemove: (_node: ElementNode) => {
            const cur = inner.state.get();
            const curVals = Array.isArray(cur) ? cur : [cur];
            const filter = curVals.filter((v) => v !== opt.value);
            inner.multiple
              ? inner.state.set(filter as any)
              : inner.state.set(filter[0] as any);
          },
        };
      });
      items.push(buildInput(inner.input));
      return items;
    },
    _key: "comboboxWrap",
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(1),
    },
  });

  const attachInner = (
    node: ElementNode,
    inner: InnerProps,
  ): ComboboxInner => {
    let query = node.getMetadata("comboboxQuery") as State<string> | undefined;
    if (!query) {
      query = toState("");
      node.setMetadata("comboboxQuery", query);
    }
    return {
      query,
      update(next) {
        node.children.update([buildWrap(next)]);
      },
    };
  };

  const partial: PartialElement = {
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"combobox" primitive patch must use div tag`);
      }
    },
    _onSchedule: (node, element) => {
      (element as Record<string, unknown>)[node.tagName] = [
        buildWrap({
          options,
          multiple,
          color,
          state,
          input: props.input,
        }),
      ];
    },
    ...behavior<InnerProps>("comboboxInner", attachInner, {
      options,
      multiple,
      color,
      state,
      input: props.input,
    }),
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
