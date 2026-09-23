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
 * @param props.accentColor - Accent color for focus rings on summary. Defaults to `"primary"`.
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
      const el = node.domElement;
      if (!el) return;

      if (type === "single") {
        const handler = (event: Event) => {
          const summary = (event.target as Element).closest("summary");
          if (!summary) return;
          const item = summary.closest("details") as HTMLDetailsElement | null;
          if (!item || item.parentElement !== el) return;
          if (!item.open) {
            Array.from(el.querySelectorAll(":scope > details")).forEach(
              (detail) => {
                if (detail !== item)
                  (detail as HTMLDetailsElement).open = false;
              },
            );
          }
        };
        el.addEventListener("click", handler);
        node.addHook("Remove", () => el.removeEventListener("click", handler));
      }

      // WAI-ARIA APG accordion pattern (optional, both modes): ArrowUp/Down
      // moves focus between headers, Home/End jump to the first/last. Tab
      // already reaches every summary; this is an accelerator on top of it.
      const onKeyDown = (event: Event) => {
        const key = (event as KeyboardEvent).key;
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
        const summary = (event.target as Element).closest("summary");
        if (!summary) return;
        const item = summary.closest("details") as HTMLDetailsElement | null;
        if (!item || item.parentElement !== el) return;
        const summaries = Array.from(
          el.querySelectorAll<HTMLElement>(":scope > details > summary"),
        );
        const index = summaries.indexOf(summary as HTMLElement);
        if (index === -1) return;
        let next = index;
        if (key === "ArrowDown") next = (index + 1) % summaries.length;
        else if (key === "ArrowUp")
          next = (index - 1 + summaries.length) % summaries.length;
        else if (key === "Home") next = 0;
        else if (key === "End") next = summaries.length - 1;
        event.preventDefault();
        summaries[next]?.focus();
      };
      el.addEventListener("keydown", onKeyDown);
      node.addHook("Remove", () =>
        el.removeEventListener("keydown", onKeyDown),
      );
    },
    style: {
      display: "flex",
      flexDirection: "column",
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      outlineOffset: "-1px",
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      overflow: "hidden",
      "& > details": {
        borderBottom: (listener) =>
          `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      },
      "& > details:last-child": {
        borderBottom: "none",
      },
      "& > details > summary:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
    },
  };
}

export { accordion };
