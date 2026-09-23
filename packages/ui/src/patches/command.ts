import {
  type ElementNode,
  merge,
  type PartialElement,
  toState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { fieldTextStyle } from "../utils/fieldText.js";
import { focusRing } from "../utils/focusRing.js";

// Items opt in with `data-command-item`; `commandItem` hides non-matching
// rows with the `hidden` attribute, so the filter and the keyboard walk
// agree on what is currently on screen.
function visibleItems(host: HTMLElement): HTMLElement[] {
  return Array.from(
    host.querySelectorAll<HTMLElement>("[data-command-item]"),
  ).filter((el) => !el.hidden && !el.hasAttribute("disabled"));
}

// Arrow-key navigation over the filtered result list is what makes a command
// palette usable from the search field (cmdk / shadcn Command parity): without
// it the only way to reach a result was Tab, which also walked every hidden
// row's siblings. Enter runs the highlighted item.
function onCommandKey(event: Event, node: ElementNode): void {
  const key = (event as KeyboardEvent).key;
  const host = node.domElement as HTMLElement | null;
  if (!host) return;
  const items = visibleItems(host);
  if (!items.length) return;
  const active = host.ownerDocument.activeElement as HTMLElement | null;
  const current = active ? items.indexOf(active) : -1;

  if (key === "Enter") {
    if (current === -1) return;
    event.preventDefault();
    items[current]!.click();
    return;
  }

  let next: number;
  // Wraps at both ends — the search field stays focused until Down is pressed,
  // so there is no "above the first item" position to fall back to.
  if (key === "ArrowDown") next = (current + 1) % items.length;
  else if (key === "ArrowUp")
    next = current <= 0 ? items.length - 1 : current - 1;
  else if (key === "Home") next = 0;
  else if (key === "End") next = items.length - 1;
  else return;

  event.preventDefault();
  const target = items[next]!;
  target.focus();
  target.scrollIntoView?.({ block: "nearest" });
}

/**
 * Command-palette container patch. Sets up a vertical flex column and provides a
 * shared `command` context (a query State) consumed by `commandSearch` and
 * `commandItem` descendants to filter the list. Typically applied to a `<div>`.
 *
 * @example { div: [...], $: [command()] }
 */
function command(): PartialElement {
  return {
    // Group (not listbox): search input + option buttons share one container;
    // listbox forbids non-option children (aria-required-children).
    role: "group",
    ariaLabel: "Commands",
    onKeyDown: onCommandKey,
    _onSchedule: (_node, element) => {
      merge(element, {
        _context: {
          command: {
            query: toState(""),
          },
        },
      });
    },
    style: {
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
  };
}

/**
 * Search input for a command palette. Wires the input's value into the parent
 * `command` context's query State so descendant `commandItem`s filter live.
 * Apply to an `<input>` element used inside a `command()`.
 *
 * @hostTag input
 * @param props.color - Base theme color tone. Defaults to "neutral".
 * @param props.accentColor - Accent color used for the focus border. Defaults to "primary".
 * @example { input: null, $: [commandSearch({ accentColor: "primary" })] }
 */
function commandSearch(
  props: { color?: ThemeColor; accentColor?: ThemeColor } = {},
): PartialElement {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    _onInsert: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"commandSearch" patch must use input tag`);
      }
    },
    _onMount: (node) => {
      const ctx = node.getContext("command");
      if (!ctx) {
        console.warn(`"commandSearch" patch must be used inside a "command"`);
        return;
      }
      const input = node.domElement as HTMLInputElement;
      const onInput = () => ctx.query.set(input.value);
      input.addEventListener("input", onInput);
      node.addHook("Remove", () => input.removeEventListener("input", onInput));
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      border: "none",
      borderBottom: (listener) =>
        `1px solid ${themeColor(listener, "border", color)}`,
      outline: "none",
      ...fieldTextStyle(color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      transition: "border-bottom-color 140ms ease, box-shadow 140ms ease",
      "&:focus-visible": {
        borderBottomColor: (listener) =>
          themeColor(listener, "shift-6", accentColor),
        boxShadow: (listener) => focusRing(listener, accentColor),
      },
    },
  };
}

/**
 * Selectable item in a command palette. On mount, immediately hides itself if
 * the current query doesn't match its text content, and subscribes to future
 * query changes — so items added dynamically after a search is typed are
 * correctly filtered. Apply to a `<button>` inside a `command()`. Uses native
 * button semantics (not `role=option`) so the search input may sit as a
 * sibling without a listbox parent requirement. A non-focusable host (a bare
 * `<div>`) still filters, but the container's arrow-key walk calls `focus()`
 * on it and that is a no-op — give such a host a `tabindex` of its own.
 *
 * @param props.color - Base theme color tone. Defaults to "neutral".
 * @param props.accentColor - Accent color used for the focus ring. Defaults to "primary".
 * @example { button: "Open file", $: [commandItem({ color: "neutral" })] }
 */
function commandItem(
  props: { color?: ThemeColor; accentColor?: ThemeColor } = {},
): PartialElement {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    // Native `type` on the host still wins (mergePartial: native over patch).
    type: "button",
    // Marker the container's keyboard walk looks for.
    dataCommandItem: "",
    _onMount: (node) => {
      const ctx = node.getContext("command");
      if (!ctx) {
        console.warn(`"commandItem" patch must be used inside a "command"`);
        return;
      }
      const el = node.domElement as HTMLElement;
      // Read the label AT FILTER TIME. Captured once in _onMount it was the
      // empty string — _onMount fires before the child text node is attached —
      // so the first keystroke hid every item in the palette. Reading late
      // also keeps a reactive label in sync.
      const applyFilter = (q: string) => {
        if (q.length === 0) {
          el.hidden = false;
          return;
        }
        const text = el.textContent?.toLowerCase() ?? "";
        el.hidden = !text.includes(q.toLowerCase());
      };
      applyFilter(ctx.query.get());
      const release = ctx.query.addListener(applyFilter);
      node.addHook("Remove", release);
    },
    style: {
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      width: "100%",
      fontSize: (listener) => themeSize(listener, "inherit"),
      height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      border: "none",
      outline: "none",
      // shift-13: menu-row labels need ≥4.5:1 on light surface (visual catalog).
      color: (listener) => themeColor(listener, "shift-13", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      transition: "background-color 140ms ease, box-shadow 140ms ease",
      "&:hover:not([disabled])": {
        color: (listener) => themeColor(listener, "shift-13", color),
        backgroundColor: (listener) => themeColor(listener, "hover", color),
      },
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor),
      },
    },
  };
}

export { command, commandSearch, commandItem };
