import {
  behavior,
  type DomphyElement,
  type ElementNode,
  isState,
  type PartialElement,
  type State,
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
import { focusRing } from "../utils/focusRing.js";

function getPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function persistValue<T>(
  node: ElementNode,
  key: string,
  incoming: ValueOrState<T> | undefined,
  fallback: T,
): State<T> {
  if (isState(incoming)) {
    node.setMetadata(key, incoming);
    return incoming as State<T>;
  }
  let stored = node.getMetadata(key) as State<T> | undefined;
  if (!stored) {
    stored = toState((incoming as T | undefined) ?? fallback);
    node.setMetadata(key, stored);
  }
  return stored;
}

function persistTotal(node: ElementNode, total: number): State<number> {
  let stored = node.getMetadata("paginationTotal") as State<number> | undefined;
  if (!stored) {
    stored = toState(total);
    node.setMetadata("paginationTotal", stored);
  }
  return stored;
}

/**
 * Themed pagination control. Renders previous/next buttons plus truncated page
 * numbers (with ellipses), tracks the current page in a `State`, and updates it
 * on click. Apply to a `<div>` element.
 *
 * @hostTag div
 * @param props - Configuration.
 * @param props.total - Required. Total number of pages.
 * @param props.value - Current page, accepts a value or `State`. Defaults to `1`.
 * @param props.color - Base color tone for the page buttons. Defaults to `"neutral"`.
 * @param props.accentColor - Accent color tone for the active page. Defaults to `"primary"`.
 * @example { div: "", $: [pagination({ total: 10, value: 1 })] }
 */
function pagination(props: {
  value?: ValueOrState<number>;
  total: number;
  color?: ThemeColor;
  accentColor?: ThemeColor;
}): PartialElement {
  const { total, color = "neutral", accentColor = "primary" } = props;

  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: (listener: any) => themeSpacing(6 + themeDensity(listener) * 2),
    height: (listener: any) => themeSpacing(6 + themeDensity(listener) * 2),
    paddingInline: (listener: any) => themeSpacing(themeDensity(listener) * 2),
    borderRadius: (listener: any) => themeSpacing(themeDensity(listener) * 1.5),
    border: "none",
    cursor: "pointer",
    fontSize: (listener: any) => themeSize(listener, "inherit"),
    backgroundColor: "transparent",
    // Page numbers: shift-13 for readable inactive digits (catalog contrast).
    color: (listener: any) => themeColor(listener, "shift-13", color),
    transition:
      "background-color 140ms ease, box-shadow 140ms ease, color 140ms ease",
    "&:hover:not([disabled])": {
      color: (listener: any) => themeColor(listener, "shift-13", color),
      backgroundColor: (listener: any) => themeColor(listener, "hover", color),
    },
    "&:focus-visible": {
      boxShadow: (listener: any) => focusRing(listener, accentColor),
    },
    "&[disabled]": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  };

  const activeStyle = {
    ...btnBase,
    // Deep accent fill + light text (mid-ramp + mid text failed catalog).
    backgroundColor: (listener: any) =>
      themeColor(listener, "shift-13", accentColor),
    color: (listener: any) => themeColor(listener, "shift-0", "neutral"),
    fontWeight: "bold",
    cursor: "default",
    "&:hover:not([disabled])": {
      backgroundColor: (listener: any) =>
        themeColor(listener, "shift-13", accentColor),
    },
  };

  return {
    role: "navigation",
    ariaLabel: "Pagination",
    // Active page weight is design-system chrome for the control.
    _doctorDisable: "inline-typography",
    _onInsert: (node) => {
      if (node.tagName !== "div")
        console.warn('"pagination" patch must use div tag');
    },
    _onInit: (node) => {
      const state = persistValue(node, "paginationPage", props.value, 1);
      const totalState = persistTotal(node, total);
      const content: DomphyElement<"div"> = {
        div: (listener) => {
          const page = state.get(listener);
          const pageCount = totalState.get(listener);
          const items: DomphyElement[] = [];

          // Prev button
          items.push({
            button: "‹",
            _key: "prev",
            type: "button",
            ariaLabel: "Previous page",
            disabled: page <= 1,
            onClick: () => page > 1 && state.set(page - 1),
            style: btnBase,
          });

          // Page buttons. Keyed by page number (or a running ellipsis index —
          // there can be up to two "..." spans) so the list survives length
          // changes across pages without the unkeyed-reuse footgun.
          let ellipsisIndex = 0;
          for (const p of getPages(page, pageCount)) {
            if (p === "...") {
              items.push({
                span: "…",
                _key: `ellipsis-${ellipsisIndex++}`,
                ariaHidden: "true",
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  paddingInline: (listener: any) =>
                    themeSpacing(themeDensity(listener) * 2),
                  color: (listener: any) =>
                    themeColor(listener, "shift-7", color),
                },
              });
            } else {
              const isActive = p === page;
              items.push({
                button: String(p),
                _key: `page-${p}`,
                type: "button",
                ariaLabel: `Page ${p}`,
                ariaCurrent: isActive ? "page" : undefined,
                disabled: isActive,
                onClick: () => state.set(p),
                style: isActive ? activeStyle : btnBase,
              });
            }
          }

          // Next button
          items.push({
            button: "›",
            _key: "next",
            type: "button",
            ariaLabel: "Next page",
            disabled: page >= pageCount,
            onClick: () => page < pageCount && state.set(page + 1),
            style: btnBase,
          });

          return items;
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(1),
        },
      };
      node.children.insert(content);
    },
    ...behavior<{ total: number }>(
      "pagination-total",
      (node) => ({
        update(snapshot) {
          persistTotal(node, snapshot.total).set(snapshot.total);
        },
      }),
      { total },
    ),
    style: {
      display: "inline-flex",
    },
  };
}

export { pagination };
