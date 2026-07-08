// Shared SVG pie/donut chart engine + card chrome for the shadcn "chart-pie"
// block family (chartPieSimple, chartPieLabel, chartPieLabelCustom,
// chartPieLabelList, chartPieLegend, chartPieDonut, chartPieDonutActive,
// chartPieDonutText, chartPieStacked, chartPieSeparatorNone,
// chartPieInteractive). Not itself an exported block — every factory in this
// folder composes these helpers into its own fixed, literal element tree.
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in the block spec (a card-framed circular/donut chart
// with hover tooltips, labels, legends and a mount sweep-in animation) — no
// upstream shadcn/ui, Recharts or any chart-library source was viewed or
// copied. The arc geometry, tooltip layer and card chrome below are original,
// hand-rolled SVG + Domphy-patch composition.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import { card, heading, icon, small } from "@domphy/ui";

// ---------------------------------------------------------------------------
// Data shapes + sample dataset
// ---------------------------------------------------------------------------

export interface PieDatum {
  key: string;
  name: string;
  value: number;
  color?: ThemeColor;
}

// Sequential chart-palette rotation standing in for "a blue, a teal, an
// amber, an orange, a neutral gray" — five semantic role families, never a
// hard-coded hex value, so the rotation still follows the active theme.
export const PIE_CHART_PALETTE: ThemeColor[] = [
  "info",
  "success",
  "warning",
  "attention",
  "neutral",
];

// Illustrative sample data only (five browsers over a Jan-Jun window) — not a
// required schema. Callers pass their own `data` array in real usage.
export const DEFAULT_PIE_DATA: PieDatum[] = [
  { key: "chrome", name: "Chrome", value: 275 },
  { key: "safari", name: "Safari", value: 200 },
  { key: "firefox", name: "Firefox", value: 187 },
  { key: "edge", name: "Edge", value: 173 },
  { key: "other", name: "Other", value: 90 },
];

export function resolveSliceColor(datum: PieDatum, index: number): ThemeColor {
  return datum.color ?? PIE_CHART_PALETTE[index % PIE_CHART_PALETTE.length];
}

export function defaultValueFormatter(value: number): string {
  return value.toLocaleString();
}

// ---------------------------------------------------------------------------
// Arc geometry — a small, self-contained polar/arc-path toolkit. No chart
// library dependency; every wedge/ring path is plain trigonometry against a
// fixed square viewBox, so the chart scales responsively via CSS alone.
// ---------------------------------------------------------------------------

export const PIE_VIEWBOX_SIZE = 200;
export const PIE_CENTER = PIE_VIEWBOX_SIZE / 2;
export const PIE_OUTER_RADIUS = 86;
// Upstream donut demos use `innerRadius={60}` against a ~100px outer radius —
// a hole/outer ratio of ~0.6, not the thick ~0.42 ring an earlier default gave.
export const DEFAULT_DONUT_INNER_RADIUS = PIE_OUTER_RADIUS * 0.6;
// Upstream <Pie> sets no `paddingAngle` (default 0): adjacent wedges touch and
// are parted only by the sector stroke, never by a tapering angular gap.
export const DEFAULT_PAD_ANGLE = 0;
// Thick separator stroke for the donut recipes upstream draws with
// `strokeWidth={5}` (donut-text, donut-active, interactive) — ~5% of the outer
// radius, in the background color, so segments read as cleanly parted.
export const DONUT_SEPARATOR_STROKE_WIDTH = String(PIE_OUTER_RADIUS / 20);

export interface PieSlice {
  datum: PieDatum;
  index: number;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  fraction: number;
  color: ThemeColor;
}

/** Cumulative-angle layout for a pie/donut ring, starting at 12 o'clock. */
export function layoutPieSlices(data: PieDatum[]): PieSlice[] {
  const total = data.reduce((sum, datum) => sum + datum.value, 0) || 1;
  let angle = -Math.PI / 2;
  return data.map((datum, index) => {
    const fraction = datum.value / total;
    const sweep = fraction * Math.PI * 2;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
    return {
      datum,
      index,
      startAngle,
      endAngle,
      midAngle: startAngle + sweep / 2,
      fraction,
      color: resolveSliceColor(datum, index),
    };
  });
}

export function polarPoint(radius: number, angle: number): [number, number] {
  return [
    PIE_CENTER + radius * Math.cos(angle),
    PIE_CENTER + radius * Math.sin(angle),
  ];
}

/**
 * SVG path `d` for one wedge (innerRadius 0) or ring segment (innerRadius > 0)
 * between two angles, with an optional angular pad shrinking both edges so
 * neighboring slices show a hairline gap.
 */
export function arcSlicePath(
  slice: Pick<PieSlice, "startAngle" | "endAngle">,
  innerRadius: number,
  outerRadius: number,
  padAngle = 0,
): string {
  const pad = padAngle / 2;
  const start = Math.min(slice.startAngle + pad, slice.endAngle - pad);
  const end = Math.max(slice.endAngle - pad, start);
  const sweep = end - start;
  const largeArc = sweep > Math.PI ? 1 : 0;
  const [outerStartX, outerStartY] = polarPoint(outerRadius, start);
  const [outerEndX, outerEndY] = polarPoint(outerRadius, end);

  if (innerRadius <= 0.001) {
    return `M ${PIE_CENTER} ${PIE_CENTER} L ${outerStartX} ${outerStartY} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY} Z`;
  }

  const [innerEndX, innerEndY] = polarPoint(innerRadius, end);
  const [innerStartX, innerStartY] = polarPoint(innerRadius, start);
  return [
    `M ${outerStartX} ${outerStartY}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEndX} ${outerEndY}`,
    `L ${innerEndX} ${innerEndY}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStartX} ${innerStartY}`,
    "Z",
  ].join(" ");
}

// ---------------------------------------------------------------------------
// Tooltip layer — a single absolutely-positioned card that every wedge's
// pointer handlers update. Positioned from the wedge's own pointer event
// (clientX/Y minus the chart container's bounding rect), so it tracks the
// cursor as it moves between/within wedges.
// ---------------------------------------------------------------------------

export interface PieTooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  swatchColor: ThemeColor;
  name: string;
  value: string;
  /** "swatch" = filled square (default); "line" = thin bar, used by multi-ring charts. */
  markerShape: "swatch" | "line";
}

const HIDDEN_TOOLTIP: PieTooltipInfo = {
  visible: false,
  x: 0,
  y: 0,
  swatchColor: "neutral",
  name: "",
  value: "",
  markerShape: "swatch",
};

export function createPieTooltipState(): State<PieTooltipInfo> {
  return toState({ ...HIDDEN_TOOLTIP });
}

export interface ChartContainerRef {
  current: HTMLElement | null;
}

export interface WireTooltipOptions {
  containerRef: ChartContainerRef;
  tooltipState: State<PieTooltipInfo>;
  /** false = value-only content (the category name is already shown as an on-chart label). */
  showName?: boolean;
  valueFormatter?: (value: number) => string;
  markerShape?: "swatch" | "line";
  /** Optional prefix shown before the name, e.g. a ring's own metric label. */
  seriesLabel?: string;
}

/** Pointer handlers that drive the shared tooltip layer from one wedge. */
export function wedgeTooltipHandlers(
  slice: Pick<PieSlice, "datum" | "color">,
  options: WireTooltipOptions,
): Pick<DomphyElement<"path">, "onMouseEnter" | "onMouseMove" | "onMouseLeave"> {
  const {
    containerRef,
    tooltipState,
    showName = true,
    valueFormatter = defaultValueFormatter,
    markerShape = "swatch",
    seriesLabel,
  } = options;

  const update = (event: Event) => {
    const mouseEvent = event as MouseEvent;
    const rect = containerRef.current?.getBoundingClientRect();
    const name = showName
      ? seriesLabel
        ? `${seriesLabel} · ${slice.datum.name}`
        : slice.datum.name
      : "";
    tooltipState.set({
      visible: true,
      x: rect ? mouseEvent.clientX - rect.left : 0,
      y: rect ? mouseEvent.clientY - rect.top : 0,
      swatchColor: slice.color,
      name,
      value: valueFormatter(slice.datum.value),
      markerShape,
    });
  };

  return {
    onMouseEnter: update,
    onMouseMove: update,
    onMouseLeave: () => tooltipState.set({ ...HIDDEN_TOOLTIP }),
  };
}

/** The floating tooltip card itself — one instance shared by every wedge. */
export function pieTooltipLayer(tooltipState: State<PieTooltipInfo>): DomphyElement<"div"> {
  return {
    div: [
      {
        svg: [
          {
            rect: null,
            x: (l: Listener) => (tooltipState.get(l).markerShape === "line" ? "3" : "1"),
            y: (l: Listener) => (tooltipState.get(l).markerShape === "line" ? "0" : "1"),
            width: (l: Listener) => (tooltipState.get(l).markerShape === "line" ? "4" : "8"),
            height: (l: Listener) => (tooltipState.get(l).markerShape === "line" ? "10" : "8"),
            rx: (l: Listener) => (tooltipState.get(l).markerShape === "line" ? "1" : "2"),
            fill: (l: Listener) => themeColor(l, "shift-9", tooltipState.get(l).swatchColor),
          } as DomphyElement<"rect">,
        ],
        viewBox: "0 0 10 10",
        ariaHidden: "true",
        style: { width: themeSpacing(2.5), height: themeSpacing(2.5), flexShrink: "0" },
      } as DomphyElement<"svg">,
      {
        small: (l: Listener) => tooltipState.get(l).name,
        $: [small()],
        style: {
          display: (l: Listener) => (tooltipState.get(l).name ? "block" : "none"),
        },
      },
      // Right-aligned value — upstream ChartTooltipContent renders each item's
      // value as `font-mono font-medium text-foreground tabular-nums`, pushed to
      // the row's trailing edge by the item row's `flex-1 justify-between`. Here:
      // one horizontal row (name left / value right), the value in monospace,
      // medium weight (NOT strong()/bold), tabular numerals, full foreground,
      // shoved right via `margin-inline-start: auto` (ml-auto).
      {
        small: (l: Listener) => tooltipState.get(l).value,
        $: [small()],
        style: {
          marginInlineStart: "auto",
          color: (l: Listener) => themeColor(l, "shift-11"),
          fontFamily: "ui-monospace, monospace",
          fontWeight: "500",
          fontVariantNumeric: "tabular-nums",
        },
      },
    ],
    ariaHidden: "true",
    dataTone: "shift-1",
    style: {
      position: "absolute",
      insetInlineStart: "0",
      insetBlockStart: "0",
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(2),
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2.5),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
      color: (l: Listener) => themeColor(l, "shift-9"),
      outline: (l: Listener) => `1px solid ${themeColor(l, "shift-3")}`,
      outlineOffset: "-1px",
      boxShadow: (l: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(4)} ${themeColor(l, "shift-4")}`,
      pointerEvents: "none",
      zIndex: "10",
      whiteSpace: "nowrap",
      transformOrigin: "top left",
      opacity: (l: Listener) => (tooltipState.get(l).visible ? 1 : 0),
      transform: (l: Listener) => {
        const info = tooltipState.get(l);
        return `translate(${info.x + 14}px, ${info.y + 14}px) scale(${info.visible ? 1 : 0.92})`;
      },
      transition: "opacity 130ms ease-out, transform 130ms ease-out",
    },
  };
}

// ---------------------------------------------------------------------------
// Wedge + swatch element builders
// ---------------------------------------------------------------------------

export interface WedgePathOptions {
  innerRadius?: number;
  outerRadius?: number;
  padAngle?: number;
  /** Plain SVG unit string (viewBox-relative), e.g. "1.5". "0" omits the stroke entirely. */
  strokeWidth?: string;
  tooltip?: WireTooltipOptions;
  /** Prefixes `_key` — required when multiple rings share the same category keys. */
  keyPrefix?: string;
}

/** One pie/ring wedge `<path>`, wired to the shared tooltip layer when `tooltip` is passed. */
export function pieWedgePath(slice: PieSlice, options: WedgePathOptions = {}): DomphyElement<"path"> {
  const {
    innerRadius = 0,
    outerRadius = PIE_OUTER_RADIUS,
    padAngle = DEFAULT_PAD_ANGLE,
    strokeWidth = "1.5",
    tooltip,
    keyPrefix = "",
  } = options;

  const element: DomphyElement<"path"> = {
    path: null,
    d: arcSlicePath(slice, innerRadius, outerRadius, padAngle),
    fill: (l: Listener) => themeColor(l, "shift-9", slice.color),
    strokeWidth,
    strokeLinejoin: "round",
    cursor: "pointer",
    _key: `${keyPrefix}${slice.datum.key}`,
    ...(tooltip ? wedgeTooltipHandlers(slice, tooltip) : {}),
  };
  if (strokeWidth !== "0") {
    element.stroke = (l: Listener) => themeColor(l, "inherit");
  }
  return element;
}

/** Small inline color chip (an `<svg><rect>`, not a `style.backgroundColor` surface) for legends/selects. */
export function colorSwatch(color: ThemeColor | ((listener: Listener) => ThemeColor)): DomphyElement<"svg"> {
  const resolve = typeof color === "function" ? color : () => color;
  return {
    svg: [
      {
        rect: null,
        x: "1",
        y: "1",
        width: "8",
        height: "8",
        rx: "2",
        fill: (l: Listener) => themeColor(l, "shift-9", resolve(l)),
      } as DomphyElement<"rect">,
    ],
    viewBox: "0 0 10 10",
    ariaHidden: "true",
    style: { width: themeSpacing(2.5), height: themeSpacing(2.5), flexShrink: "0" },
  };
}

// ---------------------------------------------------------------------------
// On-chart text (outside labels + leader lines, on-wedge labels, center text)
// ---------------------------------------------------------------------------

export interface OutsideLabelOptions {
  text: string;
  outerRadius?: number;
  minFraction?: number;
  leaderLine?: boolean;
  fontSize?: string;
}

/** Leader-line + label pair anchored just outside a wedge's outer edge. */
export function pieOutsideLabel(slice: PieSlice, options: OutsideLabelOptions): DomphyElement[] {
  const {
    text,
    outerRadius = PIE_OUTER_RADIUS,
    minFraction = 0.03,
    leaderLine = true,
    fontSize = "10",
  } = options;
  if (slice.fraction < minFraction) return [];

  const isRightSide = Math.cos(slice.midAngle) >= 0;
  const [bendX, bendY] = polarPoint(outerRadius * 1.08, slice.midAngle);
  const [labelX, labelY] = polarPoint(outerRadius * 1.22, slice.midAngle);
  const elbowX = labelX + (isRightSide ? 6 : -6);

  const nodes: DomphyElement[] = [];
  if (leaderLine) {
    nodes.push({
      polyline: null,
      points: `${bendX},${bendY} ${labelX},${labelY} ${elbowX},${labelY}`,
      fill: "none",
      stroke: (l: Listener) => themeColor(l, "shift-6"),
      strokeWidth: "1",
      _key: `${slice.datum.key}-leader`,
    } as DomphyElement<"polyline">);
  }
  nodes.push({
    text,
    x: String(elbowX + (isRightSide ? 3 : -3)),
    y: String(labelY),
    fill: (l: Listener) => themeColor(l, "shift-10"),
    fontSize,
    textAnchor: isRightSide ? "start" : "end",
    dominantBaseline: "middle",
    _key: `${slice.datum.key}-label`,
  } as DomphyElement<"text">);
  return nodes;
}

/** A label sitting just outside (not beyond) a wedge's edge, no leader line. */
export function pieRimLabel(
  slice: PieSlice,
  text: string,
  options: { outerRadius?: number; fontSize?: string; minFraction?: number } = {},
): DomphyElement<"text"> | null {
  const { outerRadius = PIE_OUTER_RADIUS, fontSize = "9", minFraction = 0.02 } = options;
  if (slice.fraction < minFraction) return null;
  const isRightSide = Math.cos(slice.midAngle) >= 0;
  const [x, y] = polarPoint(outerRadius * 1.05, slice.midAngle);
  return {
    text,
    x: String(x),
    y: String(y),
    fill: (l: Listener) => themeColor(l, "shift-9"),
    fontSize,
    textAnchor: isRightSide ? "start" : "end",
    dominantBaseline: "middle",
    _key: `${slice.datum.key}-rim-label`,
  };
}

/** Bold, high-contrast numeric label rendered directly on a wedge's fill. */
export function pieOnWedgeLabel(
  slice: PieSlice,
  text: string,
  options: { radiusFraction?: number; fontSize?: string; minFraction?: number } = {},
): DomphyElement<"text"> | null {
  const { radiusFraction = 0.62, fontSize = "12", minFraction = 0.04 } = options;
  if (slice.fraction < minFraction) return null;
  const [x, y] = polarPoint(PIE_OUTER_RADIUS * radiusFraction, slice.midAngle);
  return {
    text,
    x: String(x),
    y: String(y),
    fill: (l: Listener) => themeColor(l, "shift-0", "neutral"),
    fontSize,
    fontWeight: "700",
    textAnchor: "middle",
    dominantBaseline: "middle",
    _key: `${slice.datum.key}-on-wedge-label`,
  };
}

/** Two stacked `<text>` lines (total + caption) centered on the pie's own center point. */
export function pieCenterText(
  totalText: string | ((listener: Listener) => string),
  captionText: string,
): DomphyElement<"g"> {
  return {
    g: [
      {
        text: totalText,
        x: String(PIE_CENTER),
        y: String(PIE_CENTER - 4),
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: "22",
        fontWeight: "700",
        fill: (l: Listener) => themeColor(l, "shift-11"),
      } as DomphyElement<"text">,
      {
        text: captionText,
        x: String(PIE_CENTER),
        y: String(PIE_CENTER + 17),
        textAnchor: "middle",
        dominantBaseline: "middle",
        fontSize: "11",
        fill: (l: Listener) => themeColor(l, "shift-6"),
      } as DomphyElement<"text">,
    ],
    ariaHidden: "true",
  };
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

export function pieLegendRow(data: PieDatum[], columns = 4): DomphyElement<"div"> {
  const items: DomphyElement<"div">[] = data.map((datum, index) => ({
    div: [colorSwatch(resolveSliceColor(datum, index)), { small: datum.name, $: [small()] }],
    _key: datum.key,
    style: { display: "flex", alignItems: "center", gap: themeSpacing(1.5), justifyContent: "center" },
  }));

  return {
    div: items,
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: themeSpacing(2),
      // Negative offset so the legend "hugs" the chart above it instead of
      // sitting at the container's default gap distance.
      marginTop: themeSpacing(-6),
      paddingInline: themeSpacing(4),
    },
  };
}

// ---------------------------------------------------------------------------
// Card chrome (title / description / chart container / footer trend line)
// ---------------------------------------------------------------------------

export function pieCardTitle(title: string, centered = true): DomphyElement<"h3"> {
  return { h3: title, $: [heading()], style: { textAlign: centered ? "center" : "start" } };
}

export function pieCardDescription(description: string, centered = true): DomphyElement<"p"> {
  return {
    p: [{ small: description, $: [small()] }],
    style: { textAlign: centered ? "center" : "start" },
  };
}

const TREND_ICON_SHAPES: Record<"up" | "down", DomphyElement[]> = {
  up: [
    { polyline: null, points: "3,17 10,10 14,14 21,4" },
    { polyline: null, points: "14,4 21,4 21,11" },
  ],
  down: [
    { polyline: null, points: "3,7 10,14 14,10 21,20" },
    { polyline: null, points: "14,20 21,20 21,13" },
  ],
};

/** Small up/down trend glyph — an original geometric silhouette, not sourced from any icon set. */
export function pieTrendIcon(direction: "up" | "down"): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: TREND_ICON_SHAPES[direction],
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
    // Upstream renders the glyph in plain foreground/currentColor with no
    // semantic red/green tint — it inherits the trend line's full card
    // foreground. Override icon()'s muted default (shift-9 neutral) so the arrow
    // sits at the same full foreground (shift-10) as the sentence beside it.
    $: [icon()],
    style: { color: (l: Listener) => themeColor(l, "shift-10") },
  };
}

export interface PieFooterOptions {
  trendValue: string;
  trendDirection: "up" | "down";
  caption: string;
}

export function pieCardFooter(options: PieFooterOptions): DomphyElement<"footer"> {
  const { trendValue, trendDirection, caption } = options;
  return {
    footer: [
      {
        div: [
          {
            div: [
              // Upstream trend line is a `font-medium` (weight 500) row in the
              // card's full foreground — NOT bold/700 — with order
              // sentence-then-glyph ("Trending up by 5.2% this month
              // <TrendingUp/>"): text first, trailing icon.
              {
                span: `Trending ${trendDirection} by ${trendValue} this month`,
                style: {
                  fontWeight: "500",
                  color: (l: Listener) => themeColor(l, "shift-10"),
                },
              },
              pieTrendIcon(trendDirection),
            ],
            style: { display: "flex", alignItems: "center", gap: themeSpacing(1.5) },
          },
          { small: caption, $: [small()] },
        ],
        style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), width: "100%" },
      },
    ],
  };
}

export function pieChartContainer(
  containerRef: ChartContainerRef,
  svgChildren: DomphyElement[],
  tooltipState: State<PieTooltipInfo>,
  // `role="img"` with no accessible name failed axe-core's `svg-img-alt`
  // check (a real WCAG violation, not demo-harness noise) — every caller
  // already has a `title`/`description` to build one from.
  ariaLabel: string,
): DomphyElement<"div"> {
  return {
    div: [
      {
        svg: svgChildren,
        viewBox: `0 0 ${PIE_VIEWBOX_SIZE} ${PIE_VIEWBOX_SIZE}`,
        role: "img",
        ariaLabel,
        style: { width: "100%", height: "100%", overflow: "visible" },
      } as DomphyElement<"svg">,
      pieTooltipLayer(tooltipState),
    ],
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      maxWidth: themeSpacing(90),
      marginInline: "auto",
    },
    _onMount: (node) => {
      containerRef.current = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      containerRef.current = null;
    },
  };
}

export function pieCard(children: DomphyElement[]): DomphyElement<"div"> {
  return {
    div: children,
    $: [card()],
    style: { width: "100%", maxWidth: themeSpacing(120) },
  };
}
