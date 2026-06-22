import { merge, type PartialElement, toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

/**
 * Command-palette container patch. Sets up a vertical flex column and provides a
 * shared `command` context (a query State) consumed by `commandSearch` and
 * `commandItem` descendants to filter the list. Typically applied to a `<div>`.
 *
 * @example { div: [...], $: [command()] }
 */
function command(): PartialElement {
  return {
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
 * @example { input: "", $: [commandSearch({ accentColor: "primary" })] }
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
      fontFamily: "inherit",
      fontSize: (listener) => themeSize(listener, "inherit"),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      border: "none",
      borderBottom: (listener) =>
        `1px solid ${themeColor(listener, "shift-3", color)}`,
      outline: "none",
      color: (listener) => themeColor(listener, "shift-10", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&::placeholder": {
        color: (listener) => themeColor(listener, "shift-7"),
      },
      "&:focus-visible": {
        borderBottomColor: (listener) =>
          themeColor(listener, "shift-6", accentColor),
      },
    },
  };
}

/**
 * Selectable item (`role="option"`) in a command palette. Subscribes to the
 * parent `command` context's query State and hides itself when its text content
 * does not match the current query. Typically applied to a `<button>` (or any
 * clickable element) used inside a `command()`.
 *
 * @param props.color - Base theme color tone. Defaults to "neutral".
 * @param props.accentColor - Accent color used for the focus outline. Defaults to "primary".
 * @example { button: "Open file", $: [commandItem({ color: "neutral" })] }
 */
function commandItem(
  props: { color?: ThemeColor; accentColor?: ThemeColor } = {},
): PartialElement {
  const { color = "neutral", accentColor = "primary" } = props;
  return {
    role: "option",
    _onMount: (node) => {
      const ctx = node.getContext("command");
      if (!ctx) {
        console.warn(`"commandItem" patch must be used inside a "command"`);
        return;
      }
      const el = node.domElement as HTMLElement;
      const text = el.textContent?.toLowerCase() ?? "";
      const applyFilter = (q: string) => {
        el.hidden = q.length > 0 && !text.includes(q.toLowerCase());
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
      color: (listener) => themeColor(listener, "shift-9", color),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      "&:hover:not([disabled])": {
        backgroundColor: (listener) => themeColor(listener, "shift-2", color),
      },
      "&:focus-visible": {
        outline: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
        outlineOffset: `-${themeSpacing(0.5)}`,
      },
    },
  };
}

export { command, commandSearch, commandItem };
