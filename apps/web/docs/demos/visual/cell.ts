import type { DomphyElement } from "@domphy/core";
import {
  themeColor,
  themeFont,
  themeLetterSpacing,
  themeSize,
  themeSpacing,
  themeWeight,
} from "@domphy/theme";

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
    minHeight?: string;
    maxHeight?: string;
    overflow?: string;
    /** Stack full-width shells (layouts) instead of flex-wrap row of controls. */
    block?: boolean;
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
          fontWeight: themeWeight("semibold"),
          letterSpacing: themeLetterSpacing("wide"),
          // "text", not "muted": the id label is essential content (it names
          // the capture target), and muted sits below AA by design.
          color: (l) => themeColor(l, "text"),
          fontFamily: themeFont("monospace"),
        },
      },
      {
        div: children,
        // Capture root — Playwright screenshots this node only.
        dataVisual: id,
        dataVisualFocus: opts.focus ? "1" : undefined,
        dataVisualHover: opts.hover ? "1" : undefined,
        // The raised cell fill MUST come with a tone context. Painting
        // themeColor(l, "surface") without dataTone leaves every demo mounted
        // inside resolving its "text"/"muted" against the page floor instead of
        // this fill — a 8-step gap instead of the 9-step contract, which shows
        // up as color-contrast failures that do not exist on the real docs
        // pages. Shift the context, then paint "inherit".
        dataTone: "shift-1",
        style: {
          display: opts.block ? "block" : "flex",
          flexWrap: opts.block ? undefined : "wrap",
          alignItems: opts.block ? undefined : "center",
          gap: themeSpacing(2),
          minWidth: opts.minWidth ?? "0",
          minHeight: opts.minHeight,
          maxHeight: opts.maxHeight,
          overflow: opts.overflow ?? "visible",
          padding: themeSpacing(3),
          borderRadius: themeSpacing(2),
          border: (l) => `1px solid ${themeColor(l, "border")}`,
          backgroundColor: (l) => themeColor(l, "inherit"),
          color: (l) => themeColor(l, "text"),
        },
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: "0",
    },
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
          fontWeight: themeWeight("bold"),
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
      color: (l) => themeColor(l, "text"),
    },
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
          fontWeight: themeWeight("bold"),
          margin: `0 0 ${themeSpacing(2)}`,
          color: (l) => themeColor(l, "text"),
          // Solo block pages title the page "Block <camelCaseName>" — a long
          // unbreakable camelCase word must wrap on narrow viewports instead
          // of overflowing (it tripped the responsive sweep's overflow gate).
          overflowWrap: "anywhere",
        },
      },
      {
        p: "Visual regression catalog — each [data-visual] cell is a Playwright screenshot target (props + states).",
        style: {
          margin: `0 0 ${themeSpacing(8)}`,
          color: (l) => themeColor(l, "text"),
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
      // The page floor itself — "inherit", not a tinted "surface". A tint here
      // without a matching dataTone shifted the fill under every child while
      // their text tones stayed on the floor (see the cell's note below), and
      // it also flattened the raised cells into the page.
      backgroundColor: (l) => themeColor(l, "inherit"),
      color: (l) => themeColor(l, "text"),
      minHeight: "100vh",
      boxSizing: "border-box",
    },
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
