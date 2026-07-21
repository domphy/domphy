import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Container patch that groups `<details>` elements into a bordered accordion.
 * In `type: "single"` mode (default), opening one item closes all siblings.
 *
 * @param props.type - `"single"` (default) or `"multiple"`. Single mode auto-closes siblings.
 * @param props.color - Theme color tone for borders and backgrounds. Defaults to `"neutral"`.
 * @param props.accentColor - Accent color for focus outlines on summary. Defaults to `"primary"`.
 * @example
 * { div: [
 *   { details: [{ summary: "Section A" }, { p: "Content A" }], $: [details()] },
 *   { details: [{ summary: "Section B" }, { p: "Content B" }], $: [details()] },
 * ], $: [accordion()] }
 */
function accordion(
  props: {
    type?: "single" | "multiple";
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const { type = "single" } = props;
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    _onMount: (node) => {
      if (type !== "single") return;

      const el = node.domElement;
      if (!el) return;
      const handler = (event: Event) => {
        const summary = (event.target as Element).closest("summary");
        if (!summary) return;
        const item = summary.closest("details") as HTMLDetailsElement | null;
        if (!item || item.parentElement !== el) return;
        if (!item.open) {
          Array.from(el.querySelectorAll(":scope > details")).forEach(
            (detail) => {
              if (detail !== item) (detail as HTMLDetailsElement).open = false;
            },
          );
        }
      };
      el.addEventListener("click", handler);
      node.addHook("Remove", () => el.removeEventListener("click", handler));
    },
    style: {
      display: "flex",
      flexDirection: "column",
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      outlineOffset: "-1px",
      color: (listener) =>
        themeColor(listener, "text", color.get(listener)),
      overflow: "hidden",
      "& > details": {
        borderBottom: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      },
      "& > details:last-child": {
        borderBottom: "none",
      },
      "& > details > summary:focus-visible": {
        boxShadow: (listener) =>
          focusRing(listener, accentColor.get(listener)),
      },
    },
  };
}

export { accordion };
