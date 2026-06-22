import {
  type DomphyElement,
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
  const state = toState(props.value ?? 1);

  const btnBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: (listener: any) => themeSpacing(6 + themeDensity(listener) * 2),
    height: (listener: any) => themeSpacing(6 + themeDensity(listener) * 2),
    paddingInline: (listener: any) => themeSpacing(themeDensity(listener) * 2),
    borderRadius: (listener: any) => themeSpacing(themeDensity(listener) * 1),
    border: "none",
    cursor: "pointer",
    fontSize: (listener: any) => themeSize(listener, "inherit"),
    backgroundColor: "transparent",
    color: (listener: any) => themeColor(listener, "shift-9", color),
    "&:hover:not([disabled])": {
      backgroundColor: (listener: any) =>
        themeColor(listener, "shift-2", color),
    },
    "&[disabled]": {
      opacity: 0.4,
      cursor: "not-allowed",
    },
  };

  const activeStyle = {
    ...btnBase,
    backgroundColor: (listener: any) =>
      themeColor(listener, "shift-6", accentColor),
    color: (listener: any) => themeColor(listener, "shift-11", accentColor),
    fontWeight: "600",
    cursor: "default",
    "&:hover:not([disabled])": {
      backgroundColor: (listener: any) =>
        themeColor(listener, "shift-6", accentColor),
    },
  };

  return {
    role: "navigation",
    ariaLabel: "Pagination",
    _onInsert: (node) => {
      if (node.tagName !== "div")
        console.warn('"pagination" patch must use div tag');
    },
    _onInit: (node) => {
      const content: DomphyElement<"div"> = {
        div: (listener) => {
          const page = state.get(listener);
          const items: DomphyElement[] = [];

          // Prev button
          items.push({
            button: "‹",
            type: "button",
            ariaLabel: "Previous page",
            disabled: page <= 1,
            onClick: () => page > 1 && state.set(page - 1),
            style: btnBase,
          });

          // Page buttons
          for (const p of getPages(page, total)) {
            if (p === "...") {
              items.push({
                span: "…",
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
            type: "button",
            ariaLabel: "Next page",
            disabled: page >= total,
            onClick: () => page < total && state.set(page + 1),
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
    style: {
      display: "inline-flex",
    },
  };
}

export { pagination };
