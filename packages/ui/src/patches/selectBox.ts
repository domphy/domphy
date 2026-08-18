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

// Typeahead (Radix Select character-search parity): printable characters
// accumulate into a buffer that resets after 1s of idle; the buffer is a
// case-insensitive prefix match against option labels. CLOSED trigger: the
// match becomes the selection (native <select> behavior). OPEN panel: focus
// moves to the matching [role=option] — focus is the keyboard highlight.
// A buffer of one repeated character ("aaa") cycles through that char's
// matches instead of pinning the first; disabled options are skipped.
const TYPEAHEAD_RESET_MS = 1000;

type TypeaheadMeta = {
  buffer: string;
  timer: ReturnType<typeof setTimeout> | null;
};

// The buffer lives on the NODE (not the factory closure): a selectBox inside
// a reactive parent gets a fresh closure per ancestor re-render, and a
// closure-local buffer would silently reset mid-typing on the reused node.
function resolveTypeahead(node: ElementNode): TypeaheadMeta {
  let meta = node.getMetadata("selectBoxTypeahead") as
    | TypeaheadMeta
    | undefined;
  if (!meta) {
    meta = { buffer: "", timer: null };
    node.setMetadata("selectBoxTypeahead", meta);
  }
  return meta;
}

const matchesPrefix = (label: string, needle: string) =>
  label.trim().toLowerCase().startsWith(needle);

function enabledPanelOptions(panel: Element | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(
    panel.querySelectorAll<HTMLElement>("[role=option]"),
  ).filter(
    (el) =>
      el.getAttribute("aria-disabled") !== "true" &&
      !el.hasAttribute("disabled"),
  );
}

/**
 * A clickable select trigger box that renders the currently selected option(s) as removable
 * tags and toggles a floating popover (the dropdown content) anchored to itself. Selected
 * labels are derived from `options` matching the bound `value`; removing a tag updates the value.
 * Keyboard: Enter/Space toggle, ArrowDown opens, Escape closes, and printable characters
 * typeahead-search options (closed: selects the match; open: focuses the matching
 * `[role=option]` in the panel; a repeated character cycles matches).
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
  const { show, hide, anchorPartial } = createFloating({
    kind: "selectBox",
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
  };

  const buildWrap = (inner: InnerProps): DomphyElement<"div"> => ({
    div: (listener) => {
      const val = inner.state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      const opts = inner.options.filter((opt) => vals.includes(opt.value));
      return opts.map((opt) => ({
        span: opt.label,
        $: [tag({ color: inner.color, removable: inner.multiple })],
        _key: opt.value,
        _onRemove: (_node: ElementNode) => {
          const cur = inner.state.get();
          const curVals = Array.isArray(cur) ? cur : [cur];
          const filter = curVals.filter((v) => v !== opt.value);
          inner.multiple
            ? inner.state.set(filter as any)
            : inner.state.set(filter[0] as any);
        },
      })) as DomphyElement<"span">[];
    },
    _key: "selectBoxWrap",
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(1),
      flex: 1,
    } as StyleObject,
  });

  const attachInner = (
    node: ElementNode,
    _inner: InnerProps,
  ): BehaviorInstance<InnerProps> => {
    return {
      update(next) {
        node.children.update([buildWrap(next)]);
      },
    };
  };

  const toggle = (node?: ElementNode) =>
    openState.get() ? hide(node) : show(node);

  const typeahead = (key: string, node: ElementNode) => {
    const meta = resolveTypeahead(node);
    if (meta.timer) clearTimeout(meta.timer);
    meta.buffer += key.toLowerCase();
    meta.timer = setTimeout(() => {
      meta.buffer = "";
    }, TYPEAHEAD_RESET_MS);
    // "aaa" cycles through the a* matches rather than matching "aaa" literally.
    const repeated = meta.buffer.length > 1 && new Set(meta.buffer).size === 1;
    const needle = repeated ? meta.buffer[0]! : meta.buffer;

    if (openState.get()) {
      // Panel is portaled under the root (see floating.ts); its id is
      // deterministic, same lookup pattern as popover's onBlur guard.
      const root = node.getRoot().domElement as Element | null;
      const panel =
        root?.querySelector(`#${floatingPanelId("selectBox", node)}`) ?? null;
      const matches = enabledPanelOptions(panel).filter((el) =>
        matchesPrefix(el.textContent ?? "", needle),
      );
      if (!matches.length) return;
      const active = node.domElement?.ownerDocument
        ?.activeElement as HTMLElement | null;
      const from = repeated && active ? matches.indexOf(active) : -1;
      const target = matches[(from + 1) % matches.length]!;
      target.focus();
      target.scrollIntoView?.({ block: "nearest" });
      return;
    }

    // Closed trigger: selection follows typeahead. Single-select only — a
    // multi-select tag set has no "current option" to move from.
    if (multiple) return;
    const matches = options.filter((opt) => matchesPrefix(opt.label, needle));
    if (!matches.length) return;
    const from = repeated
      ? matches.findIndex((opt) => opt.value === state.get())
      : -1;
    const next = matches[(from + 1) % matches.length]!;
    state.set(next.value as any);
  };

  const partial: PartialElement = {
    _onInsert: (node) => {
      if (node.tagName !== "div") {
        console.warn(`"selectBox" patch must use div tag`);
      }
    },
    _onSchedule: (node, element) => {
      (element as Record<string, unknown>)[node.tagName] = [
        buildWrap({ options, multiple, color, state }),
      ];
    },
    ...behavior<InnerProps>("selectBoxInner", attachInner, {
      options,
      multiple,
      color,
      state,
    }),
    onClick: (_e, node) => toggle(node),
    // Focusable trigger: click + Enter/Space/ArrowDown open (APG button+listbox).
    // Escape dismiss composes with createFloating's hide path.
    tabindex: 0,
    role: "button",
    // Reactive boolean (same pattern as popover) — do NOT pin a static
    // ariaExpanded or patch re-apply will overwrite after keyboard open.
    ariaExpanded: (listener) => openState.get(listener),
    ariaHaspopup: "listbox",
    ariaControls: (listener) =>
      listener?.elementNode
        ? floatingPanelId("selectBox", listener.elementNode)
        : undefined,
    onKeyDown: (e, node) => {
      const key = (e as KeyboardEvent).key;
      if (key === "Escape") {
        hide(node);
        return;
      }
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        toggle(node);
        return;
      }
      if (key === "ArrowDown" && !openState.get()) {
        e.preventDefault();
        show(node);
        return;
      }
      // Character typeahead (Radix Select parity) — modifier chords are
      // shortcuts, not search input.
      const kb = e as KeyboardEvent;
      if (key.length === 1 && !kb.ctrlKey && !kb.metaKey && !kb.altKey) {
        typeahead(key, node);
      }
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      minHeight: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      minWidth: themeSpacing(32),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", "neutral")}`,
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      fontSize: (listener) => themeSize(listener, "inherit"),
      color: (listener) => themeColor(listener, "text", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      transition:
        "background-color 140ms ease, outline-color 140ms ease, box-shadow 140ms ease",
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, color),
      },
    },
  };

  merge(anchorPartial, partial);
  return anchorPartial;
}

export { selectBox };
