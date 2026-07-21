import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";

/**
 * One screenshot target. Playwright selects `[data-visual="<id>"]`.
 * Optional flags drive interaction before capture (focus / hover / open).
 */
export type VisualMeta = {
  id: string;
  label: string;
  /** Focus the first focusable descendant before screenshot. */
  focus?: boolean;
  /** Hover the capture root before screenshot. */
  hover?: boolean;
};

export function visualCell(
  id: string,
  label: string,
  content: DomphyElement | DomphyElement[],
  opts: {
    focus?: boolean;
    hover?: boolean;
    minWidth?: string;
    maxHeight?: string;
    overflow?: string;
  } = {},
): DomphyElement<"div"> {
  const children = Array.isArray(content) ? content : [content];
  return {
    div: [
      {
        small: label,
        style: {
          display: "block",
          marginBottom: themeSpacing(1.5),
          fontSize: (l) => themeSize(l, "decrease-2"),
          fontWeight: "600",
          letterSpacing: "0.02em",
          color: (l) => themeColor(l, "muted"),
          fontFamily:
            'var(--dp-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
        },
      },
      {
        div: children,
        // Capture root — Playwright screenshots this node only.
        dataVisual: id,
        dataVisualFocus: opts.focus ? "1" : undefined,
        dataVisualHover: opts.hover ? "1" : undefined,
        style: {
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: themeSpacing(2),
          minWidth: opts.minWidth ?? "0",
          maxHeight: opts.maxHeight,
          overflow: opts.overflow ?? "visible",
          padding: themeSpacing(3),
          borderRadius: themeSpacing(2),
          border: (l) => `1px solid ${themeColor(l, "border")}`,
          backgroundColor: (l) => themeColor(l, "surface"),
          color: (l) => themeColor(l, "text"),
        },
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: "0",
    },
    _doctorDisable: true,
  };
}

export function visualSection(
  title: string,
  cells: DomphyElement[],
): DomphyElement<"section"> {
  return {
    section: [
      {
        h2: title,
        style: {
          fontSize: (l) => themeSize(l, "increase-1"),
          fontWeight: "700",
          margin: `0 0 ${themeSpacing(3)}`,
          color: (l) => themeColor(l, "text"),
        },
      },
      {
        div: cells,
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: themeSpacing(4),
          alignItems: "start",
        },
      },
    ],
    style: {
      display: "block",
      marginBottom: themeSpacing(10),
      paddingBottom: themeSpacing(6),
      borderBottom: (l) => `1px solid ${themeColor(l, "border")}`,
    },
    _doctorDisable: true,
  };
}

export function visualPage(
  title: string,
  sections: DomphyElement[],
): DomphyElement<"div"> {
  return {
    div: [
      {
        h1: title,
        style: {
          fontSize: (l) => themeSize(l, "increase-3"),
          fontWeight: "700",
          margin: `0 0 ${themeSpacing(2)}`,
          color: (l) => themeColor(l, "text"),
        },
      },
      {
        p: "Visual regression catalog — each [data-visual] cell is a Playwright screenshot target (props + states).",
        style: {
          margin: `0 0 ${themeSpacing(8)}`,
          color: (l) => themeColor(l, "muted"),
          maxWidth: "60ch",
        },
      },
      ...sections,
    ],
    dataVisualPage: "1",
    style: {
      padding: themeSpacing(6),
      maxWidth: "1400px",
      margin: "0 auto",
      backgroundColor: (l) => themeColor(l, "surface"),
      color: (l) => themeColor(l, "text"),
      minHeight: "100vh",
      boxSizing: "border-box",
    },
    _doctorDisable: true,
  };
}

/** Theme colors used across prop matrices. */
export const COLORS = [
  "primary",
  "secondary",
  "success",
  "warning",
  "danger",
  "error",
  "info",
  "neutral",
] as const;

export type CatalogColor = (typeof COLORS)[number];
