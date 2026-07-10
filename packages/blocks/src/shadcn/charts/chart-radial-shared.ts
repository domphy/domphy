// Shared building blocks for the shadcn "chart-radial" recipe family
// (chartRadialSimple / Label / Shape / Grid / Stacked / Text). Not itself an
// exported block — every factory in this family composes these helpers into
// its own fixed, literal element tree.
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in the block specs (a card-shelled concentric radial
// bar/gauge chart with a trend footer). Layout, sample data and code are
// original.
//
// Engineering note (why this family draws raw SVG instead of routing through
// @domphy/chart like the chart-area family does): @domphy/chart's
// GaugeRenderer (packages/chart/src/gl/GaugeRenderer.ts) draws a single track
// + progress arc per gauge *series* at one shared radius — it has no concept
// of per-ring rounded caps, inline arc labels, decorative framing circles, or
// stacked multi-segment bands, and its hit-testing engine explicitly skips
// `type: "gauge"` series (packages/chart/src/engine.ts, both the axis-trigger
// loop and `hitTestPie`), so hover tooltips are not supported for gauges at
// all today. Building six recipes on top of that engine would mean re-adding
// most of this geometry as new engine features anyway — out of scope for a
// leaf `blocks` package. The spec's own domSketch already describes the
// target shape directly ("svg radial chart ... + tooltip layer (portal/
// absolute div)"), so these recipes draw the rings/arcs as plain SVG paths
// inside the Domphy element tree and layer an absolutely-positioned HTML
// tooltip + label overlay on top — no WebGL/ResizeObserver dependency needed.

import type { DomphyElement, Listener } from "@domphy/core";
import { type State, toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import { card, heading, motion, paragraph, small } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

// ─── Data shapes ───────────────────────────────────────────────────────────

export interface RadialSeriesDatum {
  key: string;
  label: string;
  value: number;
  color?: ThemeColor;
}

// ─── Original sample dataset (five marketing-channel sessions, invented for
// this port — magnitude spread only loosely mirrors the reference recipe's
// browser-share demo, no upstream values copied) ───────────────────────────

export const RADIAL_CHANNEL_DATA: RadialSeriesDatum[] = [
  { key: "organic", label: "Organic Search", value: 275 },
  { key: "paid", label: "Paid Social", value: 214 },
  { key: "referral", label: "Referral", value: 173 },
  { key: "direct", label: "Direct", value: 129 },
  { key: "email", label: "Email", value: 92 },
];

export const RADIAL_STACKED_SEGMENTS: RadialSeriesDatum[] = [
  { key: "new", label: "New customers", value: 682, color: "primary" },
  {
    key: "returning",
    label: "Returning customers",
    value: 419,
    color: "secondary",
  },
];

// ─── Color rotation ────────────────────────────────────────────────────────

// Five rotating theme accent hues — same idea as chart-area's
// CHART_AREA_SERIES_PALETTE (packages/chart/src/gl/color.ts SERIES_PALETTE
// rotation order), just carrying two more steps since these recipes plot five
// concentric rings instead of up to three lines/areas.
export const RADIAL_ACCENT_PALETTE: ThemeColor[] = [
  "primary",
  "secondary",
  "success",
  "warning",
  "info",
];

export function radialSeriesColor(
  index: number,
  explicit?: ThemeColor,
): ThemeColor {
  return (
    explicit ?? RADIAL_ACCENT_PALETTE[index % RADIAL_ACCENT_PALETTE.length]
  );
}

// ─── Geometry ──────────────────────────────────────────────────────────────
//
// All recipes share one internal square SVG coordinate space so an HTML
// overlay (labels, tooltip, center text) can be positioned with plain CSS
// percentages that always line up with the SVG regardless of the container's
// rendered pixel size.

export const RADIAL_VIEW_SIZE = 200;
export const RADIAL_CENTER = RADIAL_VIEW_SIZE / 2;

/** Point on a circle. Angle 0 = top (12 o'clock), increasing clockwise. */
export function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/** Converts an SVG user-space coordinate (0..RADIAL_VIEW_SIZE) to a CSS percent. */
export function toPercent(value: number): number {
  return (value / RADIAL_VIEW_SIZE) * 100;
}

// Arc commands can't express more than ~180° per segment, so a sweep beyond
// that (or beyond a full turn, as chartRadialLabel needs) is chained from
// several sub-180° "A" commands.
const ARC_SEGMENT_MAX_DEGREES = 179.5;

/** Open-arc path `d` string (stroke it — this is not a filled pie wedge). */
export function describeRadialArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const totalSweep = endAngleDeg - startAngleDeg;
  if (totalSweep <= 0.001) return "";
  const segments: Array<[number, number]> = [];
  let segmentStart = startAngleDeg;
  let consumed = 0;
  while (consumed < totalSweep - 0.001) {
    const segmentSweep = Math.min(
      ARC_SEGMENT_MAX_DEGREES,
      totalSweep - consumed,
    );
    segments.push([segmentStart, segmentStart + segmentSweep]);
    segmentStart += segmentSweep;
    consumed += segmentSweep;
  }
  const first = polarPoint(cx, cy, radius, segments[0][0]);
  const commands = [`M ${first.x} ${first.y}`];
  for (const [, segmentEnd] of segments) {
    const point = polarPoint(cx, cy, radius, segmentEnd);
    commands.push(`A ${radius} ${radius} 0 0 1 ${point.x} ${point.y}`);
  }
  return commands.join(" ");
}

/** Geometric stroke length of a circular arc, in SVG user units. */
export function radialArcLength(
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): number {
  return radius * ((Math.max(0, endAngleDeg - startAngleDeg) * Math.PI) / 180);
}

export interface RadialRingGeometry {
  radius: number;
  thickness: number;
}

/**
 * Lays out `count` concentric ring bands between `innerRadius` and
 * `outerRadius` (outermost ring first), each `thickness` wide with `gap`
 * space between neighbors — mirrors recharts' RadialBarChart inner/outer
 * radius convention (an overall band split evenly across N bars).
 */
export function computeRingLayout(
  count: number,
  outerRadius: number,
  innerRadius: number,
  gap: number,
): RadialRingGeometry[] {
  const totalBand = Math.max(0, outerRadius - innerRadius);
  const thickness = Math.max(1, (totalBand - gap * (count - 1)) / count);
  const rings: RadialRingGeometry[] = [];
  for (let index = 0; index < count; index++) {
    const radius = outerRadius - thickness / 2 - index * (thickness + gap);
    rings.push({ radius, thickness });
  }
  return rings;
}

// ─── Grow-in reveal (shared eased sweep-in used by every recipe) ──────────
//
// Each arc is drawn at its FINAL geometry once, then "drawn on" via the
// classic stroke-dasharray/dashoffset technique: dasharray is set to the
// arc's own geometric length (a solid, gap-less dash exactly as long as the
// path) and dashoffset animates from that same length (fully hidden) down to
// 0 (fully revealed).

export const RADIAL_GROW_TRANSITION = {
  duration: 600,
  easing: "ease-out",
} as const;

// ─── Arc / track / grid primitives ─────────────────────────────────────────

export interface RadialArcPathProps {
  cx: number;
  cy: number;
  radius: number;
  thickness: number;
  startAngleDeg: number;
  endAngleDeg: number;
  color: ThemeColor;
  capStyle?: "butt" | "round";
  tooltip?: RadialTooltipController;
  tooltipLabel?: string;
  tooltipValue?: number;
  seriesKey: string;
}

/** One ring/segment's colored arc, stroked and grow-in animated. */
export function radialArcPath(
  props: RadialArcPathProps,
): DomphyElement<"path"> {
  const {
    cx,
    cy,
    radius,
    thickness,
    startAngleDeg,
    endAngleDeg,
    color,
    capStyle = "butt",
    tooltip,
    tooltipLabel,
    tooltipValue,
    seriesKey,
  } = props;
  const pathData = describeRadialArc(
    cx,
    cy,
    radius,
    startAngleDeg,
    endAngleDeg,
  );
  const length = radialArcLength(radius, startAngleDeg, endAngleDeg) || 0.0001;

  const element: DomphyElement<"path"> = {
    path: null,
    d: pathData,
    fill: "none",
    stroke: (listener: Listener) => themeColor(listener, "shift-9", color),
    strokeWidth: thickness,
    strokeLinecap: capStyle,
    strokeDasharray: length,
    style: { cursor: tooltip ? "pointer" : "default" },
    $: [
      motion({
        initial: { strokeDashoffset: length },
        animate: { strokeDashoffset: 0 },
        transition: RADIAL_GROW_TRANSITION,
      }),
    ],
    _key: seriesKey,
  };

  if (tooltip && tooltipLabel) {
    element.onMouseEnter = (event) =>
      tooltip.show(event as MouseEvent, {
        label: tooltipLabel,
        color,
        value: tooltipValue,
      });
    element.onMouseMove = (event) => tooltip.move(event as MouseEvent);
    element.onMouseLeave = () => tooltip.hide();
  }

  return element;
}

/** Pale full-circle track drawn behind a ring's own arc. */
export function radialBackgroundTrack(
  cx: number,
  cy: number,
  radius: number,
  thickness: number,
): DomphyElement<"circle"> {
  return {
    circle: null,
    cx,
    cy,
    r: radius,
    fill: "none",
    stroke: (listener: Listener) => themeColor(listener, "shift-3"),
    strokeWidth: thickness,
  };
}

/** Thin decorative/reference circle outline (polar gridline or framing ring). */
export function radialThinCircle(
  cx: number,
  cy: number,
  radius: number,
  tone: "muted" | "surface" = "muted",
): DomphyElement<"circle"> {
  return {
    circle: null,
    cx,
    cy,
    r: radius,
    fill: "none",
    stroke: (listener: Listener) =>
      tone === "muted"
        ? themeColor(listener, "shift-3")
        : themeColor(listener, "inherit"),
    strokeWidth: 1,
  };
}

// ─── Cursor-following tooltip (swatch + label, portal-free overlay div) ────

export interface RadialTooltipEntry {
  label: string;
  color: ThemeColor;
  /** Numeric value shown right-aligned after the label (upstream
   * ChartTooltipContent renders `item.value.toLocaleString()`). */
  value?: number;
}

interface RadialTooltipStateShape {
  visible: boolean;
  label: string;
  color: ThemeColor;
  value?: number;
  x: number;
  y: number;
}

export interface RadialTooltipController {
  state: State<RadialTooltipStateShape>;
  bindContainer: (element: HTMLElement | null) => void;
  show: (event: MouseEvent, entry: RadialTooltipEntry) => void;
  move: (event: MouseEvent) => void;
  hide: () => void;
}

/** One tooltip controller per chart instance — tracks the hovered ring + cursor position. */
export function createRadialTooltip(): RadialTooltipController {
  const state = toState<RadialTooltipStateShape>({
    visible: false,
    label: "",
    color: "neutral",
    value: undefined,
    x: 0,
    y: 0,
  });
  let container: HTMLElement | null = null;

  const positionFromEvent = (event: MouseEvent) => {
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return {
    state,
    bindContainer: (element) => {
      container = element;
    },
    show: (event, entry) => {
      state.set({
        visible: true,
        label: entry.label,
        color: entry.color,
        value: entry.value,
        ...positionFromEvent(event),
      });
    },
    move: (event) => {
      const current = state.get();
      if (!current.visible) return;
      state.set({ ...current, ...positionFromEvent(event) });
    },
    hide: () => {
      const current = state.get();
      state.set({ ...current, visible: false });
    },
  };
}

/** Floating swatch + label tooltip, positioned near the cursor via a live transform. */
export function radialTooltipLayer(
  tooltip: RadialTooltipController,
): DomphyElement<"div"> {
  return {
    div: [
      {
        span: null,
        // Decorative color chip — shows the hovered series' own fixed accent
        // color, not the ambient surface tone, and carries no text of its
        // own. Exempt from tone-background-inherit (the swatch's whole point
        // is a fixed color, not "inherit") and from missing-color (no text to
        // color here).
        _doctorDisable: ["tone-background-inherit", "missing-color"],
        style: {
          display: "inline-block",
          width: themeSpacing(2.5),
          height: themeSpacing(2.5),
          borderRadius: themeSpacing(1),
          flexShrink: "0",
          backgroundColor: (listener: Listener) =>
            themeColor(listener, "shift-9", tooltip.state.get(listener).color),
        },
      } as DomphyElement<"span">,
      {
        small: (listener: Listener) => tooltip.state.get(listener).label,
        $: [small({ color: "neutral" })],
      } as DomphyElement<"small">,
      // Right-aligned numeric value — upstream ChartTooltipContent renders
      // `item.value.toLocaleString()` in `font-mono font-medium
      // text-foreground tabular-nums`, pushed to the row's end via the parent
      // `flex-1 justify-between`. Here: full-strength (box) color, monospace
      // family, medium weight, tabular numerals, and `margin-inline-start:auto`
      // (ml-auto) to shove the value against the row's trailing edge.
      {
        small: (listener: Listener) => {
          const value = tooltip.state.get(listener).value;
          return value == null ? "" : value.toLocaleString();
        },
        $: [small({ color: "neutral" })],
        style: {
          marginInlineStart: "auto",
          color: (listener: Listener) => themeColor(listener, "shift-9"),
          fontFamily: fixed("ui-monospace, monospace"),
          fontWeight: fixed("500"),
          fontVariantNumeric: "tabular-nums",
        },
      } as DomphyElement<"small">,
    ],
    dataTone: "shift-17",
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: "20",
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(1.5),
      paddingBlock: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 2.5),
      borderRadius: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      backgroundColor: (listener: Listener) => themeColor(listener),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      pointerEvents: "none",
      whiteSpace: "nowrap",
      opacity: (listener: Listener) =>
        tooltip.state.get(listener).visible ? "1" : "0",
      transform: (listener: Listener) => {
        const current = tooltip.state.get(listener);
        return `translate(${current.x + 14}px, ${current.y - 14}px)`;
      },
    },
  };
}

// ─── Card shell (centered title/description, matching every upstream
// chart-radial-*.tsx's `<CardHeader className="items-center pb-0">` — distinct
// from the left-aligned chartCardShell the other chart families use) ─────────

export interface RadialCardShellProps {
  title: string;
  description: string;
  content: DomphyElement<"div">;
  footer?: DomphyElement<"footer">;
}

export function radialCardShell(
  props: RadialCardShellProps,
): DomphyElement<"div"> {
  const { title, description, content, footer } = props;
  const children: DomphyElement[] = [
    { h3: title, $: [heading()], style: { textAlign: "center" } },
    {
      p: description,
      $: [paragraph({ color: "neutral" })],
      style: { textAlign: "center" },
    },
    content,
  ];
  if (footer) children.push(footer);
  return {
    div: children,
    $: [card({ color: "neutral" })],
    style: { width: "100%" },
  };
}

// ─── Center value/caption label (HTML overlay, so it can reuse ui typography) ─

export function radialCenterLabel(props: {
  valueText: string;
  captionText: string;
  topPercent?: number;
}): DomphyElement<"div"> {
  const { valueText, captionText, topPercent = 50 } = props;
  return {
    div: [
      {
        h2: valueText,
        $: [heading({ color: "neutral" })],
        style: { marginBottom: 0 },
      } as DomphyElement<"h2">,
      {
        small: captionText,
        $: [small({ color: "neutral" })],
      } as DomphyElement<"small">,
    ],
    style: {
      position: "absolute",
      left: "50%",
      top: `${topPercent}%`,
      transform: "translate(-50%, -50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      pointerEvents: "none",
    },
  };
}

// ─── Multi-ring rings chart (chartRadialSimple / Label / Grid) ────────────

export interface RadialRingsChartProps {
  data: RadialSeriesDatum[];
  tooltip: RadialTooltipController;
  outerRadius?: number;
  innerRadius?: number;
  ringGap?: number;
  showBackgroundTrack?: boolean;
  showGridCircles?: boolean;
  gridCircleCount?: number;
  showInlineLabels?: boolean;
  /** "value": sweep = value/max * 360, from the top. "extended": sweep scales
   * across a domain that runs slightly past a full turn, with a floor so even
   * the smallest ring keeps room for its inline label. */
  sweepMode?: "value" | "extended";
  minSweepDegrees?: number;
  maxSweepDegrees?: number;
  capStyle?: "butt" | "round";
  heightUnits?: number;
}

/** The `svg` + label overlay + tooltip layer shared by the ring-chart recipes. */
export function renderRadialRingsChart(
  props: RadialRingsChartProps,
): DomphyElement<"div"> {
  const {
    data,
    tooltip,
    outerRadius = 90,
    innerRadius = outerRadius * 0.25,
    ringGap = 2,
    showBackgroundTrack = true,
    showGridCircles = false,
    gridCircleCount = 4,
    showInlineLabels = false,
    sweepMode = "value",
    minSweepDegrees = 40,
    maxSweepDegrees = 380,
    capStyle = "butt",
    heightUnits = 72,
  } = props;

  const rings = computeRingLayout(
    data.length,
    outerRadius,
    innerRadius,
    ringGap,
  );
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const cx = RADIAL_CENTER;
  const cy = RADIAL_CENTER;
  const extendedStartAngle = -5;

  const backgroundElements: DomphyElement[] = [];
  const arcElements: DomphyElement[] = [];
  const labelElements: DomphyElement[] = [];

  if (showGridCircles) {
    for (let index = 0; index < gridCircleCount; index++) {
      const radius =
        innerRadius +
        ((outerRadius - innerRadius) / (gridCircleCount - 1)) * index;
      backgroundElements.push({
        ...radialThinCircle(cx, cy, radius, "muted"),
        _key: `grid-${index}`,
      });
    }
  }

  data.forEach((point, index) => {
    const ring = rings[index];
    const color = radialSeriesColor(index, point.color);

    if (showBackgroundTrack) {
      backgroundElements.push({
        ...radialBackgroundTrack(cx, cy, ring.radius, ring.thickness),
        _key: `track-${point.key}`,
      });
    }

    const startAngle = sweepMode === "extended" ? extendedStartAngle : 0;
    const domainSweep =
      sweepMode === "extended" ? maxSweepDegrees - extendedStartAngle : 360;
    const rawSweep = (point.value / maxValue) * domainSweep;
    const sweep =
      sweepMode === "extended" ? Math.max(minSweepDegrees, rawSweep) : rawSweep;
    const endAngle = startAngle + sweep;

    arcElements.push(
      radialArcPath({
        cx,
        cy,
        radius: ring.radius,
        thickness: ring.thickness,
        startAngleDeg: startAngle,
        endAngleDeg: endAngle,
        color,
        capStyle,
        tooltip,
        tooltipLabel: point.label,
        tooltipValue: point.value,
        seriesKey: point.key,
      }),
    );

    if (showInlineLabels) {
      const labelAngle = startAngle + Math.min(8, sweep * 0.25);
      const labelPoint = polarPoint(cx, cy, ring.radius, labelAngle);
      labelElements.push({
        small: point.label,
        style: {
          position: "absolute",
          left: `${toPercent(labelPoint.x)}%`,
          top: `${toPercent(labelPoint.y)}%`,
          transform: "translate(-6%, -50%)",
          color: (listener: Listener) => themeColor(listener, "shift-1", color),
          textTransform: "capitalize",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        },
        $: [small({ color: "neutral" })],
        _key: `label-${point.key}`,
      } as DomphyElement<"small">);
    }
  });

  return {
    div: [
      {
        svg: [...backgroundElements, ...arcElements],
        viewBox: `0 0 ${RADIAL_VIEW_SIZE} ${RADIAL_VIEW_SIZE}`,
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        },
      } as DomphyElement<"svg">,
      ...labelElements,
      radialTooltipLayer(tooltip),
    ],
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      maxHeight: themeSpacing(heightUnits),
      marginInline: "auto",
    },
    _onMount(node) {
      tooltip.bindContainer(node.domElement as HTMLElement);
    },
    _onRemove() {
      tooltip.bindContainer(null);
    },
  } as DomphyElement<"div">;
}

// ─── Single-value gauge (chartRadialShape / Text) ──────────────────────────

export interface RadialGaugeProps {
  color: ThemeColor;
  sweepDegrees: number;
  outerRadius?: number;
  /** Ring thickness as a fraction of outerRadius left unfilled by the inner radius. */
  innerRadiusRatio?: number;
  capStyle?: "butt" | "round";
  showDecorativeCircles?: boolean;
  showBackgroundTrack?: boolean;
  valueText: string;
  captionText: string;
  heightUnits?: number;
}

/** Static single-arc gauge with two decorative framing circles + a centered value/caption. */
export function renderRadialGauge(
  props: RadialGaugeProps,
): DomphyElement<"div"> {
  const {
    color,
    sweepDegrees,
    outerRadius = 90,
    innerRadiusRatio = 0.66,
    capStyle = "butt",
    showDecorativeCircles = true,
    showBackgroundTrack = true,
    valueText,
    captionText,
    heightUnits = 72,
  } = props;
  const cx = RADIAL_CENTER;
  const cy = RADIAL_CENTER;
  const thickness = outerRadius * (1 - innerRadiusRatio);
  const ringRadius = outerRadius - thickness / 2;

  const children: DomphyElement[] = [];

  if (showBackgroundTrack) {
    children.push({
      ...radialBackgroundTrack(cx, cy, ringRadius, thickness),
      _key: "track",
    });
  }
  if (showDecorativeCircles) {
    children.push(
      {
        ...radialThinCircle(cx, cy, ringRadius + thickness / 2 + 3, "muted"),
        _key: "decorative-outer",
      },
      {
        ...radialThinCircle(cx, cy, ringRadius - thickness / 2 - 3, "surface"),
        _key: "decorative-inner",
      },
    );
  }
  children.push(
    radialArcPath({
      cx,
      cy,
      radius: ringRadius,
      thickness,
      startAngleDeg: 0,
      endAngleDeg: sweepDegrees,
      color,
      capStyle,
      seriesKey: "value",
    }),
  );

  return {
    div: [
      {
        svg: children,
        viewBox: `0 0 ${RADIAL_VIEW_SIZE} ${RADIAL_VIEW_SIZE}`,
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        },
      } as DomphyElement<"svg">,
      radialCenterLabel({ valueText, captionText }),
    ],
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      maxHeight: themeSpacing(heightUnits),
      marginInline: "auto",
    },
  };
}

// ─── Stacked half-circle gauge (chartRadialStacked) ────────────────────────

export interface RadialStackedGaugeProps {
  segments: RadialSeriesDatum[];
  tooltip: RadialTooltipController;
  totalText: string;
  captionText: string;
  startAngle?: number;
  sweepDegrees?: number;
  outerRadius?: number;
  innerRadiusRatio?: number;
  segmentGapDegrees?: number;
  heightUnits?: number;
}

/** Two-or-more segments sharing one thick band, stacked end-to-end with a small separating gap. */
export function renderRadialStackedGauge(
  props: RadialStackedGaugeProps,
): DomphyElement<"div"> {
  const {
    segments,
    tooltip,
    totalText,
    captionText,
    startAngle = -90,
    sweepDegrees = 180,
    outerRadius = 90,
    innerRadiusRatio = 0.75,
    segmentGapDegrees = 1.5,
    heightUnits = 64,
  } = props;
  const cx = RADIAL_CENTER;
  const cy = RADIAL_CENTER;
  const thickness = outerRadius * (1 - innerRadiusRatio);
  const ringRadius = outerRadius - thickness / 2;
  const totalValue =
    segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  let cursor = startAngle;
  const arcElements: DomphyElement[] = [];
  segments.forEach((segment, index) => {
    const color = radialSeriesColor(index, segment.color);
    const segmentSweep = (segment.value / totalValue) * sweepDegrees;
    const segmentStart = cursor + (index === 0 ? 0 : segmentGapDegrees / 2);
    const segmentEnd =
      cursor +
      segmentSweep -
      (index === segments.length - 1 ? 0 : segmentGapDegrees / 2);
    arcElements.push(
      radialArcPath({
        cx,
        cy,
        radius: ringRadius,
        thickness,
        startAngleDeg: segmentStart,
        endAngleDeg: Math.max(segmentStart + 0.5, segmentEnd),
        color,
        capStyle: "round",
        tooltip,
        tooltipLabel: segment.label,
        tooltipValue: segment.value,
        seriesKey: segment.key,
      }),
    );
    cursor += segmentSweep;
  });

  return {
    div: [
      {
        svg: arcElements,
        viewBox: `0 0 ${RADIAL_VIEW_SIZE} ${RADIAL_VIEW_SIZE}`,
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        },
      } as DomphyElement<"svg">,
      // Center total/caption at the chart's true vertical center (topPercent
      // defaults to 50 / cy), matching renderRadialGauge — the previous
      // (cy − outerRadius*0.5) sat too high inside the arc band.
      radialCenterLabel({ valueText: totalText, captionText }),
      radialTooltipLayer(tooltip),
    ],
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      maxHeight: themeSpacing(heightUnits),
      marginInline: "auto",
    },
    _onMount(node) {
      tooltip.bindContainer(node.domElement as HTMLElement);
    },
    _onRemove() {
      tooltip.bindContainer(null);
    },
  } as DomphyElement<"div">;
}
