import {
  type DomphyElement,
  type ElementNode,
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
import { enabledOptionsIn } from "../utils/optionList.js";

// WAI-ARIA APG Listbox keyboard model: Down/Up move to the next/previous
// option, Home/End to the first/last, Enter/Space choose the focused option.
// Focus IS the highlight here (options carry tabindex=-1), matching the
// selectBox typeahead which already moves focus between options.
function onListboxKey(event: Event, node: ElementNode): void {
  const key = (event as KeyboardEvent).key;
  const host = node.domElement as HTMLElement | null;
  if (!host) return;
  const options = enabledOptionsIn(host);
  if (!options.length) return;
  const active = host.ownerDocument.activeElement as HTMLElement | null;
  const current = active ? options.indexOf(active) : -1;

  if (key === "Enter" || key === " ") {
    if (current === -1) return;
    event.preventDefault();
    options[current]!.click();
    return;
  }

  let next: number;
  if (key === "ArrowDown") next = Math.min(options.length - 1, current + 1);
  else if (key === "ArrowUp") next = current <= 0 ? 0 : current - 1;
  else if (key === "Home") next = 0;
  else if (key === "End") next = options.length - 1;
  else return;

  event.preventDefault();
  const target = options[next]!;
  target.focus();
  target.scrollIntoView?.({ block: "nearest" });
}

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

  // type=hidden form fields (not a visible input) — avoid axe label/listbox noise.
  const inputs: DomphyElement<"div"> = {
    div: (listener) => {
      const val = state.get(listener);
      const vals = Array.isArray(val) ? val : [val];
      return vals.map((v) => ({
        input: null,
        type: "hidden",
        name: props.name,
        // Preserve a legitimate numeric 0 (and other falsy-but-valid values);
        // `v || ""` would drop them.
        value: v == null ? "" : String(v),
      }));
    },
    // Keep out of the a11y tree; listbox children must be options.
    ariaHidden: "true",
    hidden: true,
  };

  const partial: PartialElement = {
    dataTone: "shift-0",
    // selectItem uses role=option; options require a listbox parent (WAI-ARIA).
    role: "listbox",
    ariaLabel: "Options",
    ariaMultiselectable: multiple ? "true" : undefined,
    // Without a tab stop the whole listbox was keyboard-unreachable: its
    // options are tabindex=-1 by design (roving focus), so Tab skipped the
    // entire widget. APG's listbox example puts tabindex=0 on the container.
    tabindex: 0,
    onKeyDown: onListboxKey,
    // Published from _onSchedule (runs once per node), NOT as a declared
    // `_context`: ElementNode.patch re-merges `element._context` on every
    // re-render, and merging a freshly-built State into the live one
    // overwrote its value and its notifier's listeners — an uncontrolled
    // selection silently snapped back to the initial value whenever a
    // reactive ancestor re-rendered. Same fix as segmented/toggleGroup.
    _onSchedule: (node) => {
      node.setContext("select", { value: state, multiple });
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
      color: (listener) => themeColor(listener, "text", color),
    },
  };
  return partial;
}

export { selectList };
