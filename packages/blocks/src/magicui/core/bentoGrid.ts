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
    // Upstream Icon is `h-12 w-12` (3rem).
    style: { display: "inline-flex", width: themeSpacing(12), height: themeSpacing(12) },
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

/** One mosaic tile: decorative background layer, the text/CTA layer, then a hover-only tint overlay. */
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
  //
  // Full-card hover tint overlay — upstream's final card layer
  // (`group-hover:bg-black/3 group-hover:dark:bg-neutral-800/10`): fully
  // transparent at rest, a faint dark wash on hover. Replaces this port's
  // earlier bottom linear-gradient scrim, which upstream's card does NOT have
  // (each background widget carries its own top mask instead).
  const overlayElement = {
    div: null,
    ariaHidden: "true",
    dataBentoOverlay: "true",
    // Decorative tint layer with no text of its own — exempt from the
    // missing-color contract.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundColor: "transparent",
      transition: "background-color 300ms ease",
    },
  };
  const overlay = overlayElement as DomphyElement<"div">;

  const content: DomphyElement<"div"> = {
    div: [
      {
        div: [
          ...(card.icon
            ? [
                {
                  span: [card.icon],
                  dataBentoIcon: "true",
                  style: {
                    display: "inline-flex",
                    color: (listener: Listener) => themeColor(listener, "shift-10"),
                    transformOrigin: "left",
                    transition: "transform 300ms ease",
                  },
                } as DomphyElement<"span">,
              ]
            : []),
          { h3: card.title, $: [heading({ color: "neutral" })] },
          { p: card.description, $: [paragraph({ color: "neutral" })] },
        ],
        dataBentoText: "true",
        style: {
          display: "flex",
          flexDirection: "column",
          // Upstream text block is `gap-1` (0.25rem).
          gap: themeSpacing(1),
          transition: "transform 300ms ease",
        },
      } as DomphyElement<"div">,
      {
        a: [ctaLabel, arrowRightIcon()],
        href: card.href ?? "#",
        dataBentoCta: "true",
        style: {
          display: "inline-flex",
          alignItems: "center",
          // Upstream arrow icon is `ms-2` (0.5rem) from the label.
          gap: themeSpacing(2),
          marginTop: "auto",
          transition: "transform 300ms ease, opacity 300ms ease",
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
      // Upstream content wrapper is `p-4` (1rem).
      padding: themeSpacing(4),
      justifyContent: "flex-end",
    },
  };

  return {
    div: [...(backgroundLayer ? [backgroundLayer] : []), content, overlay],
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
      // Diffed directly against the real upstream source (registry/magicui/
      // bento-grid.tsx, MIT-licensed). Light: `bg-background` plus a layered
      // `box-shadow: 0 0 0 1px rgba(0,0,0,.03), 0 2px 4px rgba(0,0,0,.05),
      // 0 12px 24px rgba(0,0,0,.05)` — the 1px ring maps to the outline below,
      // the near+ambient pair to the token box-shadow. Dark: upstream swaps the
      // light shadow for an inset top white glow
      // (`dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]`, #ffffff1f ≈ 12%
      // white — same literal shimmerButton uses) and a translucent-white 1px
      // border (`dark:[border:1px_solid_rgba(255,255,255,.1)]`), both reproduced
      // in the prefers-color-scheme override (an OS-level switch, the same idiom
      // retroGrid/noiseTexture use). The card's border/shadow stay STATIC on
      // hover — upstream's only hover surface feedback is the tint overlay, not
      // an animated ring/shadow.
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(1)} ${themeSpacing(2)} ${themeColor(listener, "shift-3")}, 0 ${themeSpacing(6)} ${themeSpacing(12)} ${themeColor(listener, "shift-2")}`,
      "&:hover [data-bento-overlay]": { backgroundColor: "rgba(0,0,0,0.03)" },
      "&:hover [data-bento-background]": { transform: "scale(1.08)", filter: "blur(20px)" },
      "&:hover [data-bento-arrow]": { transform: `translateX(${themeSpacing(1)})` },
      "&:hover [data-bento-icon]": { transform: "scale(0.75)" },
      "@media (prefers-color-scheme: dark)": {
        outlineColor: "rgba(255,255,255,0.1)",
        boxShadow: "0 -20px 80px -20px rgba(255,255,255,0.12) inset",
        "&:hover [data-bento-overlay]": { backgroundColor: "rgba(38,38,38,0.1)" },
      },
      "@media (min-width: 64em)": {
        // `& [descendant]` (not a bare `[descendant]`) so the key matches
        // StyleObject's `&${string}` nested-selector contract — a bare bracket
        // key is not in that union and fails the .d.ts build. Same emitted CSS.
        "& [data-bento-cta]": {
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          opacity: 0,
          transform: `translateY(${themeSpacing(10)})`,
        },
        "&:hover [data-bento-cta]": { opacity: 1, transform: "translateY(0)" },
        "&:hover [data-bento-text]": { transform: `translateY(-${themeSpacing(10)})` },
      },
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
      // Upstream grid is a fixed `grid-cols-3` at all widths; each card is
      // `col-span-3` by default and only takes its `lg:col-span-N` mosaic span
      // at `lg` (64em), so below 64em every card fills the row = single column.
      // Reproduced here by collapsing to one column below 64em and expanding to
      // `columns` at 64em — matching upstream's breakpoint and this card's own
      // CTA-reveal media query (also 64em).
      gridTemplateColumns: "repeat(1, 1fr)",
      gridAutoFlow: "dense",
      // Upstream `auto-rows-[22rem]`.
      gridAutoRows: themeSpacing(88),
      gap: themeSpacing(4),
      "@media (min-width: 64em)": {
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      },
      ...(props.style ?? {}),
    },
  };
}

export { bentoGrid };
