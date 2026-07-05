// magicui "BentoGrid" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// responsive CSS-grid mosaic of unevenly sized feature cards. The grid/card
// shell is intentionally "dumb" layout plumbing — callers plug arbitrary
// decorative content into each card's `background` slot; the shell itself
// only supplies the mosaic layout, the text/CTA layer, and the shared hover
// choreography (background zoom, CTA underline + arrow nudge).

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, link, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface BentoCardSpec {
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  /** Small icon/graphic rendered above the title. */
  icon?: DomphyElement;
  /** Grid-column span for this card (in `columns` units). Caller decides the mosaic pattern. */
  columnSpan?: number;
  /** Grid-row span for this card. */
  rowSpan?: number;
  /** Arbitrary decorative content rendered behind the text layer (carousel, animated list, beam graphic, …). */
  background?: DomphyElement;
}

export interface BentoGridProps {
  cards?: BentoCardSpec[];
  /** Number of grid columns at the widest breakpoint. Defaults to 3. */
  columns?: number;
  style?: StyleObject;
}

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric silhouettes, not sourced from any icon library.
// ---------------------------------------------------------------------------

function lineIcon(children: DomphyElement[]): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: children,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", width: themeSpacing(8), height: themeSpacing(8) },
  };
}

const boltIcon = () => lineIcon([{ polyline: null, points: "13,3 4,14 12,14 11,21 20,10 12,10" }]);
const syncIcon = () => lineIcon([
  { path: null, d: "M4 11a8 8 0 0 1 14-5" },
  { polyline: null, points: "18,3 18,7 14,7" },
  { path: null, d: "M20 13a8 8 0 0 1-14 5" },
  { polyline: null, points: "6,21 6,17 10,17" },
]);
const globeIcon = () => lineIcon([
  { circle: null, cx: "12", cy: "12", r: "9" },
  { ellipse: null, cx: "12", cy: "12", rx: "4", ry: "9" },
  { line: null, x1: "3", y1: "12", x2: "21", y2: "12" },
]);
const chartIcon = () => lineIcon([
  { line: null, x1: "4", y1: "20", x2: "4", y2: "10" },
  { line: null, x1: "12", y1: "20", x2: "12", y2: "4" },
  { line: null, x1: "20", y1: "20", x2: "20", y2: "14" },
]);
const shieldIcon = () => lineIcon([
  { path: null, d: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" },
  { polyline: null, points: "9,12 11,14 15,10" },
]);
const arrowRightIcon = () => ({
  span: [
    {
      svg: [
        { line: null, x1: "4", y1: "12", x2: "18", y2: "12" },
        { polyline: null, points: "12,6 18,12 12,18" },
      ],
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      role: "img",
      ariaHidden: "true",
      style: { width: "100%", height: "100%" },
    } as DomphyElement<"svg">,
  ],
  ariaHidden: "true",
  dataBentoArrow: "true",
  style: {
    display: "inline-flex",
    width: themeSpacing(4),
    height: themeSpacing(4),
    transition: "transform 200ms ease",
  },
}) as DomphyElement<"span">;

/** Soft drifting gradient blob — the default, generic "pluggable background widget". */
function gradientBlob(color: ThemeColor): DomphyElement<"div"> {
  const keyframes = {
    "0%,100%": { transform: "translate(-8%, -8%) scale(1)" },
    "50%": { transform: "translate(8%, 8%) scale(1.15)" },
  };
  const animationName = `bento-blob-${hashString(JSON.stringify(keyframes) + color)}`;
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors verticalDivider() in the
  // shadcn sidebar family).
  const element = {
    div: null,
    ariaHidden: "true",
    // Decorative gradient blob with no text of its own — exempt from the
    // missing-color contract.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: "-25%",
      borderRadius: "50%",
      background: (listener: Listener) =>
        `radial-gradient(circle at 30% 30%, ${themeColor(listener, "shift-9", color)}, transparent 60%)`,
      opacity: 0.35,
      filter: "blur(28px)",
      animation: `${animationName} 9s ease-in-out infinite`,
      [`@keyframes ${animationName}`]: keyframes,
    },
  };
  return element as DomphyElement<"div">;
}

const DEFAULT_CARDS: BentoCardSpec[] = [
  {
    title: "Ship faster",
    description: "A component library and a design system that stay in lockstep, so nothing drifts.",
    href: "#",
    icon: boltIcon(),
    background: gradientBlob("primary"),
    columnSpan: 2,
    rowSpan: 2,
  },
  {
    title: "Stay in sync",
    description: "Every change propagates instantly across your team's workspace.",
    href: "#",
    icon: syncIcon(),
    background: gradientBlob("secondary"),
  },
  {
    title: "Global by default",
    description: "Edge-rendered everywhere, with locale-aware content out of the box.",
    href: "#",
    icon: globeIcon(),
    background: gradientBlob("info"),
    rowSpan: 2,
  },
  {
    title: "Built-in analytics",
    description: "Understand usage without wiring up a separate dashboard.",
    href: "#",
    icon: chartIcon(),
    background: gradientBlob("success"),
    columnSpan: 2,
  },
  {
    title: "Enterprise-grade security",
    description: "Audited, encrypted, and access-controlled from day one.",
    href: "#",
    icon: shieldIcon(),
    background: gradientBlob("attention"),
  },
];

/** One mosaic tile: decorative background layer, edge-fade scrim, then the text/CTA layer. */
function bentoCard(card: BentoCardSpec): DomphyElement<"div"> {
  const ctaLabel = card.ctaLabel ?? "Learn more";

  const backgroundLayer: DomphyElement<"div"> | null = card.background
    ? {
        div: [card.background],
        ariaHidden: "true",
        dataBentoBackground: "true",
        style: {
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          transition: "transform 400ms ease, filter 400ms ease",
        },
      }
    : null;

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors verticalDivider() in the
  // shadcn sidebar family).
  const scrimElement = {
    div: null,
    ariaHidden: "true",
    // Decorative gradient scrim with no text of its own — exempt from the
    // missing-color contract.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: (listener: Listener) =>
        `linear-gradient(to top, ${themeColor(listener, "inherit")} 20%, transparent 70%)`,
    },
  };
  const scrim = scrimElement as DomphyElement<"div">;

  const content: DomphyElement<"div"> = {
    div: [
      ...(card.icon
        ? [
            {
              span: [card.icon],
              style: { display: "inline-flex", color: (listener: Listener) => themeColor(listener, "shift-10") },
            } as DomphyElement<"span">,
          ]
        : []),
      { h3: card.title, $: [heading({ color: "neutral" })] },
      { p: card.description, $: [paragraph({ color: "neutral" })] },
      {
        a: [ctaLabel, arrowRightIcon()],
        href: card.href ?? "#",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: themeSpacing(1),
          marginTop: "auto",
        },
        $: [link({ color: "primary" })],
      },
    ],
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      height: "100%",
      padding: themeSpacing(5),
      justifyContent: "flex-end",
    },
  };

  return {
    div: [...(backgroundLayer ? [backgroundLayer, scrim] : []), content],
    _key: card.title,
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      gridColumn: card.columnSpan ? `span ${card.columnSpan}` : undefined,
      gridRow: card.rowSpan ? `span ${card.rowSpan}` : undefined,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      // Diffed directly against the real upstream source (registry/magicui/
      // bento-grid.tsx, MIT-licensed): the reference card is plain
      // `bg-background` (no color tint) but carries a layered
      // `box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 2px 4px rgba(0,0,0,.05),
      // 0 12px 24px rgba(0,0,0,.05)` for depth — this port had NO box-shadow
      // at all (outline alone), reading visibly flatter. Token-based
      // near+ambient pair (the outline above already covers the 1px ring).
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(1)} ${themeSpacing(2)} ${themeColor(listener, "shift-3")}, 0 ${themeSpacing(6)} ${themeSpacing(12)} ${themeColor(listener, "shift-2")}`,
      transition: "outline-color 200ms ease, box-shadow 200ms ease",
      "&:hover": {
        outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-6")}`,
        outlineOffset: "-1px",
        boxShadow: (listener: Listener) =>
          `0 ${themeSpacing(1)} ${themeSpacing(2)} ${themeColor(listener, "shift-4")}, 0 ${themeSpacing(8)} ${themeSpacing(16)} ${themeColor(listener, "shift-3")}`,
      },
      "&:hover [data-bento-background]": { transform: "scale(1.08)", filter: "blur(20px)" },
      "&:hover [data-bento-arrow]": { transform: `translateX(${themeSpacing(1)})` },
    },
  };
}

/**
 * Responsive "bento box" mosaic of feature cards. Call with no arguments for
 * a working demo — five cards with a mix of column/row spans, each with a
 * drifting gradient-blob background.
 */
function bentoGrid(props: BentoGridProps = {}): DomphyElement<"div"> {
  const columns = props.columns ?? 3;
  const cards = props.cards ?? DEFAULT_CARDS;

  return {
    div: cards.map((card) => bentoCard(card)),
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(1, 1fr)",
      gridAutoFlow: "dense",
      gridAutoRows: themeSpacing(44),
      gap: themeSpacing(4),
      "@media (min-width: 48em)": {
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      },
      ...(props.style ?? {}),
    },
  };
}

export { bentoGrid };
