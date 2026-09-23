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
import { fieldTextStyle } from "../utils/fieldText.js";
import { createFloating, floatingPanelId } from "../utils/floating.js";
import { focusRing } from "../utils/focusRing.js";
import { subscribeOpen } from "../utils/openState.js";
import { enabledOptionsIn } from "../utils/optionList.js";
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
 * @param props.open - Whether the popover is open. Optional `ValueOrState<boolean>` (including `Computed`/`ReadableState`), default false. When the source is read-only, pass `onDismiss` so dismiss can close.
 * @param props.onDismiss - Called when the popover requests close. Optional. Required to close when `open` is a read-only `Computed`/`ReadableState`.
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
  onDismiss?: () => void;
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
    onDismiss: props.onDismiss,
    placement: toState(placement),
    content: props.content,
  });

  const popoverPartial: PartialElement = {
    onClick: (_e, node) => !multiple && hide(node),
    dataTone: "shift-0",
    style: {
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      // Surface contract (dataTone-surface-contract): a tone-anchored panel
      // must declare BOTH background and text color. Page-matching shift-0
      // (same as menu/selectList/dialog), not the inverted tooltip surface.
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
    // Without an explicit rule the placeholder falls back to the UA default
    // (`darkgray` on the Chrome 88-class engines Domphy ships into — 2.3:1 on
    // a light field).
    ...fieldTextStyle(color),
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

  // WAI-ARIA APG "Combobox with List Autocomplete": Down/Up move into the
  // popup, Enter with nothing highlighted just closes it. Escape is already
  // handled document-wide by createFloating. Without this the popup was
  // mouse-only — Tab from the input skipped straight past every option.
  const moveIntoPanel = (node: ElementNode, toLast: boolean): void => {
    const anchor = findComboboxAnchor(node);
    const root = anchor.getRoot().domElement as Element | null;
    const panel =
      root?.querySelector(`#${floatingPanelId("combobox", anchor)}`) ?? null;
    const options = enabledOptionsIn(panel);
    if (!options.length) return;
    const target = options[toLast ? options.length - 1 : 0]!;
    target.focus();
    target.scrollIntoView?.({ block: "nearest" });
  };

  // show() is debounced by 100ms and flips `openState` only AFTER mounting the
  // panel, so waiting on that flip is exact where a fixed delay is not: a bare
  // requestAnimationFrame (~16ms) ran while the panel did not exist yet, and
  // in Chromium the first ArrowDown left focus on the input — only a SECOND
  // press reached an option. The extra frame after the flip is also required:
  // floating.ts drives the panel's `visibility` from the same state and that
  // style write has not landed when the listener runs, so `focus()` would hit
  // a `visibility: hidden` element and do nothing.
  const openThenMove = (node: ElementNode, toLast: boolean): void => {
    let release: (() => void) | undefined;
    release = subscribeOpen(
      openState,
      (isOpen) => {
        if (!isOpen) return;
        release?.();
        requestAnimationFrame(() => moveIntoPanel(node, toLast));
      },
      false,
    );
    show(node);
  };

  const onInputKey = (event: Event, node: ElementNode): void => {
    const key = (event as KeyboardEvent).key;
    if (key !== "ArrowDown" && key !== "ArrowUp") return;
    event.preventDefault();
    if (openState.get()) {
      moveIntoPanel(node, key === "ArrowUp");
      return;
    }
    openThenMove(node, key === "ArrowUp");
  };

  const inputAria: PartialElement = {
    role: "combobox",
    ariaHaspopup: "listbox",
    // The popup filters an existing list; it does not complete inline.
    ariaAutocomplete: "list",
    ariaExpanded: (listener) => openState.get(listener),
    ariaControls: (listener) =>
      listener?.elementNode
        ? floatingPanelId("combobox", findComboboxAnchor(listener.elementNode))
        : undefined,
    onKeyDown: onInputKey,
  };

  const buildInput = (custom?: DomphyElement): DomphyElement => {
    if (custom) {
      merge(custom, {
        onClick: (_e: Event, node: ElementNode) => show(node),
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
      // Click / typing / ArrowDown open the popup — NOT plain focus. Escape
      // returns focus to this input (floating.ts), so an onFocus that re-opens
      // made Escape un-dismissable: measured in Chromium, the panel was back
      // within 100ms of every Escape and never closed again. MUI Autocomplete
      // defaults `openOnFocus` to false for the same reason.
      onClick: (_e: Event, node: ElementNode) => show(node),
      value: (listener: { elementNode?: ElementNode }) =>
        readQuery(listener)?.get(listener as never) ?? "",
      onInput: (event: Event, node: ElementNode) => {
        node
          .getBehavior<ComboboxInner>("comboboxInner")
          ?.query.set((event.target as HTMLInputElement).value);
        show(node);
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
    _inner: InnerProps,
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
