// Shared building blocks for the shadcn "chart-radar" recipe family
// (chartRadarDefault / Dots / Multiple / Legend / Icons / LabelCustom /
// LinesOnly / Radius / Grid / GridFill / GridNone / GridCustom / GridCircle /
// GridCircleFill). Not itself an exported block — every factory in this
// family composes these helpers into its own fixed, literal element tree.
//
// Clean-room note: this is an independent reimplementation of the public
// *behavior* described in the block specs (a card-shelled polygon/circle
// radar chart with a hover tooltip and a trend footer). Layout, sample data
// and code are original.
//
// Engineering note (why raw SVG instead of @domphy/chart's RadarRenderer):
// packages/chart/src/gl/RadarRenderer.ts already draws radar grid geometry
// to an overlay <svg> (`renderGridToSvg`) and the filled polygon/outline via
// WebGL, but packages/chart/src/engine.ts explicitly skips `type: "radar"`
// series in its hit-testing loop (`if (s.type === "pie" || s.type ===
// "radar" || s.type === "gauge") continue;`), so hover tooltips are not
// supported for radar series at all today. Every recipe in this family
// requires a working hover tooltip, and several also need per-recipe grid
// variants (circular rings, a single custom ring, a tinted backdrop, spokes
// suppressed), vertex dot markers, a radius-axis reference line, and
// two-line custom tick labels that the engine's grid renderer and WebGL
// polygon path don't expose as options. Building that on top of the engine
// would mean re-adding most of this geometry as new engine features anyway —
// out of scope for a leaf `blocks` package (the same call the chart-radial
// family made — see chart-radial-shared.ts). So this family draws its own
// polygon/circle grid + polygon series geometry directly inside the Domphy
// element tree and layers an absolutely-positioned HTML tooltip on top,
// matching the spec's own domSketch ("PolarGrid (svg polygon grid lines) …
// Radar (single svg path/polygon with fill+stroke)").

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
import { type ChartLegendEntry, chartLegendRow } from "./chart-area-shared.js";

// ─── Data shapes ────────────────────────────────────────────────────────────

/** One category (spoke) worth of data — `category` plus one numeric value per series key. */
export interface RadarPoint {
  category: string;
  [seriesKey: string]: number | string;
}

export interface RadarSeriesConfig {
  key: string;
  label: string;
  color: ThemeColor;
  fillOpacity?: number;
  /** Legend glyph override (arrow icon instead of a plain swatch) — chartRadarIcons only. */
  icon?: "up" | "down";
}

// ─── Original sample datasets (six months, invented for this port — spoke
// count and magnitude spread only loosely mirror the reference recipes' own
// research note, no upstream values copied). Full month names, matching the
// family's own visual spec ("a month-name label (January through June) sits
// at the tip of each spoke") — every other chart family in this package uses
// abbreviated months, so this is a deliberate distinguishing trait of radar
// tick labels, not an oversight. ─────────────────────────────────────────────

export const RADAR_MONTHLY_SINGLE_DATA: RadarPoint[] = [
  { category: "January", value: 186 },
  { category: "February", value: 305 },
  { category: "March", value: 237 },
  { category: "April", value: 273 },
  { category: "May", value: 209 },
  { category: "June", value: 214 },
];

export const RADAR_MONTHLY_MULTI_DATA: RadarPoint[] = [
  { category: "January", desktop: 186, mobile: 160 },
  { category: "February", desktop: 305, mobile: 220 },
  { category: "March", desktop: 237, mobile: 250 },
  { category: "April", desktop: 273, mobile: 190 },
  { category: "May", desktop: 209, mobile: 240 },
  { category: "June", desktop: 214, mobile: 200 },
];

/** Tighter, more overlapping range so the two lines-only outlines visibly
 * cross — chartRadarLinesOnly's own dataset per the family's research note. */
export const RADAR_MONTHLY_TIGHT_DATA: RadarPoint[] = [
  { category: "January", desktop: 220, mobile: 205 },
  { category: "February", desktop: 195, mobile: 230 },
  { category: "March", desktop: 240, mobile: 210 },
  { category: "April", desktop: 200, mobile: 235 },
  { category: "May", desktop: 230, mobile: 200 },
  { category: "June", desktop: 210, mobile: 225 },
];

export const RADAR_SINGLE_SERIES: RadarSeriesConfig[] = [
  { key: "value", label: "Desktop", color: "primary", fillOpacity: 0.6 },
];

// Upstream draws desktop with an explicit `fillOpacity={0.6}` and mobile with
// fillOpacity omitted. recharts 3.8.0 defines no fillOpacity default (verified
// against `defaultRadarProps` in polar/Radar.tsx and the shape/Polygon.tsx
// path render — neither sets one), so the mobile polygon paints at the SVG
// default of 1.0, fully opaque on top of the translucent desktop layer.
export const RADAR_MULTI_SERIES: RadarSeriesConfig[] = [
  {
    key: "desktop",
    label: "Desktop",
    color: "primary",
    fillOpacity: 0.6,
    icon: "down",
  },
  {
    key: "mobile",
    label: "Mobile",
    color: "secondary",
    fillOpacity: 1,
    icon: "up",
  },
];

// ─── Geometry ───────────────────────────────────────────────────────────────
//
// One shared square SVG coordinate space, same idiom as chart-radial-shared
// / pie-chart-shared, so the HTML tooltip overlay can be positioned in the
// container's own pixel space while all shape math stays in fixed viewBox
// units.

export const RADAR_VIEW_SIZE = 200;
export const RADAR_CENTER = RADAR_VIEW_SIZE / 2;
export const RADAR_PLOT_RADIUS = 62;

/** Point on the radar's own polar grid. Angle 0 = top (12 o'clock), increasing clockwise. */
export function radarPolarPoint(
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: RADAR_CENTER + radius * Math.cos(angleRad),
    y: RADAR_CENTER + radius * Math.sin(angleRad),
  };
}

/** Spoke angle (degrees, clockwise from top) for category `index` of `count`. */
export function radarCategoryAngle(index: number, count: number): number {
  return (360 / count) * index;
}

function ringPoints(categoryCount: number, radius: number): string {
  return Array.from({ length: categoryCount }, (_, index) => {
    const point = radarPolarPoint(
      radius,
      radarCategoryAngle(index, categoryCount),
    );
    return `${point.x},${point.y}`;
  }).join(" ");
}

/** Angle (degrees, same 0-at-top-clockwise convention) of a point relative to the chart center. */
export function radarAngleFromCenter(localX: number, localY: number): number {
  const dx = localX - RADAR_CENTER;
  const dy = localY - RADAR_CENTER;
  let angleDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angleDeg < 0) angleDeg += 360;
  return angleDeg;
}

/** Resolves a cursor angle back to the nearest category index — hover detection is
 * keyed to the nearest spoke, not to the filled area, so it still works on
 * stroke-only/no-fill recipes. */
export function radarNearestCategoryIndex(
  angleDeg: number,
  count: number,
): number {
  const step = 360 / count;
  return Math.round(angleDeg / step) % count;
}

function textAnchorForAngle(angleDeg: number): "start" | "middle" | "end" {
  const normalized = ((angleDeg % 360) + 360) % 360;
  if (normalized > 15 && normalized < 165) return "start";
  if (normalized > 195 && normalized < 345) return "end";
  return "middle";
}

function dominantBaselineForAngle(
  angleDeg: number,
): "auto" | "hanging" | "middle" {
  const normalized = ((angleDeg % 360) + 360) % 360;
  if (normalized < 30 || normalized > 330) return "auto";
  if (normalized > 150 && normalized < 210) return "hanging";
  return "middle";
}

// ─── Grid (polygon or circular rings, optional spokes/fill) ───────────────

export interface RadarGridProps {
  categoryCount: number;
  shape?: "polygon" | "circle";
  ringCount?: number;
  /** Explicit ring radius fractions (0..1) — overrides `ringCount`'s evenly-spaced default. */
  ringFractions?: number[];
  showSpokes?: boolean;
  strokeWidth?: number;
  fill?: { color: ThemeColor; opacity: number };
  plotRadius?: number;
}

/** The angular grid's background geometry: optional tinted fill, ring lines, radial spokes. */
export function renderRadarGrid(props: RadarGridProps): DomphyElement[] {
  const {
    categoryCount,
    shape = "polygon",
    ringCount = 4,
    ringFractions,
    showSpokes = true,
    strokeWidth = 1,
    fill,
    plotRadius = RADAR_PLOT_RADIUS,
  } = props;

  const fractions =
    ringFractions ??
    Array.from({ length: ringCount }, (_, index) => (index + 1) / ringCount);
  const elements: DomphyElement[] = [];

  if (fill) {
    const outerFraction = fractions[fractions.length - 1] ?? 1;
    const radius = plotRadius * outerFraction;
    elements.push(
      shape === "circle"
        ? ({
            circle: null,
            cx: RADAR_CENTER,
            cy: RADAR_CENTER,
            r: radius,
            fill: (l: Listener) => themeColor(l, "shift-9", fill.color),
            fillOpacity: fill.opacity,
            stroke: "none",
            _key: "grid-fill",
          } as DomphyElement<"circle">)
        : ({
            polygon: null,
            points: ringPoints(categoryCount, radius),
            fill: (l: Listener) => themeColor(l, "shift-9", fill.color),
            fillOpacity: fill.opacity,
            stroke: "none",
            _key: "grid-fill",
          } as DomphyElement<"polygon">),
    );
  }

  fractions.forEach((fraction, index) => {
    const radius = plotRadius * fraction;
    elements.push(
      shape === "circle"
        ? ({
            circle: null,
            cx: RADAR_CENTER,
            cy: RADAR_CENTER,
            r: radius,
            fill: "none",
            stroke: (l: Listener) => themeColor(l, "shift-3"),
            strokeWidth,
            _key: `ring-${index}`,
          } as DomphyElement<"circle">)
        : ({
            polygon: null,
            points: ringPoints(categoryCount, radius),
            fill: "none",
            stroke: (l: Listener) => themeColor(l, "shift-3"),
            strokeWidth,
            _key: `ring-${index}`,
          } as DomphyElement<"polygon">),
    );
  });

  if (showSpokes) {
    for (let index = 0; index < categoryCount; index++) {
      const point = radarPolarPoint(
        plotRadius,
        radarCategoryAngle(index, categoryCount),
      );
      elements.push({
        line: null,
        x1: RADAR_CENTER,
        y1: RADAR_CENTER,
        x2: point.x,
        y2: point.y,
        stroke: (l: Listener) => themeColor(l, "shift-3"),
        strokeWidth: 1,
        _key: `spoke-${index}`,
      } as DomphyElement<"line">);
    }
  }

  return elements;
}

/** Faint straight reference line from the center out to the plot radius at one fixed
 * angle — a "radius axis" reference, not a full symmetric cross (chartRadarRadius only). */
export function radarRadiusAxisLine(
  plotRadius: number,
  angleDeg: number,
): DomphyElement<"line"> {
  const point = radarPolarPoint(plotRadius, angleDeg);
  return {
    line: null,
    x1: RADAR_CENTER,
    y1: RADAR_CENTER,
    x2: point.x,
    y2: point.y,
    stroke: (l: Listener) => themeColor(l, "shift-5"),
    strokeWidth: 1,
    _key: "radius-axis",
  };
}

// ─── Angle-axis labels (plain month text, or the two-line custom variant) ──

export interface RadarAngleLabelsProps {
  categories: string[];
  plotRadius?: number;
  labelOffset?: number;
  /** Extra outward nudge for the topmost (index 0) label only, so it clears the card header. */
  topExtraOffset?: number;
}

export function renderRadarAngleLabels(
  props: RadarAngleLabelsProps,
): DomphyElement[] {
  const {
    categories,
    plotRadius = RADAR_PLOT_RADIUS,
    labelOffset = 16,
    topExtraOffset = 0,
  } = props;
  const count = categories.length;
  return categories.map((label, index) => {
    const angle = radarCategoryAngle(index, count);
    const offset = labelOffset + (index === 0 ? topExtraOffset : 0);
    const point = radarPolarPoint(plotRadius + offset, angle);
    return {
      text: label,
      x: point.x,
      y: point.y,
      fill: (l: Listener) => themeColor(l, "shift-7"),
      fontSize: fixed("10"),
      textAnchor: textAnchorForAngle(angle),
      dominantBaseline: dominantBaselineForAngle(angle),
      _key: `axis-label-${label}`,
    } as DomphyElement<"text">;
  });
}

export interface RadarCustomLabelsProps {
  data: RadarPoint[];
  series: RadarSeriesConfig[];
  plotRadius?: number;
  labelOffset?: number;
  topExtraOffset?: number;
}

/** Two stacked `<text>` lines per spoke: a medium-weight two-tone value line
 * (desktop value in foreground, a muted "/" separator, mobile value in
 * foreground — three tspans, matching upstream's custom tick), then a muted
 * month-name line offset below it — replaces the plain axis label
 * (chartRadarLabelCustom only). */
export function renderRadarCustomLabels(
  props: RadarCustomLabelsProps,
): DomphyElement[] {
  const {
    data,
    series,
    plotRadius = RADAR_PLOT_RADIUS,
    labelOffset = 20,
    topExtraOffset = 8,
  } = props;
  const count = data.length;
  const [first, second] = series;
  const elements: DomphyElement[] = [];

  data.forEach((point, index) => {
    const angle = radarCategoryAngle(index, count);
    const offset = labelOffset + (index === 0 ? topExtraOffset : 0);
    const anchor = radarPolarPoint(plotRadius + offset, angle);
    const textAnchor = textAnchorForAngle(angle);
    const firstValue = point[first.key];
    const secondValue = second ? point[second.key] : undefined;

    // Three tspans: desktop value (inherits the text's foreground fill), a
    // muted "/" separator, mobile value (foreground again) — matching upstream's
    // <tspan>desktop</tspan><tspan class="fill-muted-foreground">/</tspan><tspan>mobile</tspan>.
    const valueSpans: DomphyElement[] = [
      { tspan: String(firstValue) } as DomphyElement<"tspan">,
    ];
    if (second) {
      valueSpans.push({
        tspan: "/",
        fill: (l: Listener) => themeColor(l, "shift-6"),
      } as DomphyElement<"tspan">);
      valueSpans.push({ tspan: String(secondValue) } as DomphyElement<"tspan">);
    }

    elements.push({
      text: valueSpans,
      x: anchor.x,
      y: anchor.y,
      fill: (l: Listener) => themeColor(l, "shift-11"),
      fontSize: fixed("11"),
      fontWeight: fixed("500"),
      textAnchor,
      dominantBaseline: "middle",
      _key: `custom-label-value-${point.category}`,
    } as DomphyElement<"text">);
    elements.push({
      text: String(point.category),
      x: anchor.x,
      y: anchor.y + 12,
      fill: (l: Listener) => themeColor(l, "shift-6"),
      fontSize: fixed("9"),
      textAnchor,
      dominantBaseline: "middle",
      _key: `custom-label-name-${point.category}`,
    } as DomphyElement<"text">);
  });

  return elements;
}

// ─── Grow-in reveal (shared eased scale-from-center used by every recipe) ──
//
// The whole series shape (fill/stroke polygon + its dots, grouped in one
// <g>) scales from 0 to 1 anchored at the chart's own center. `transform-box`
// for SVG content defaults to "view-box" (percentages/`center` resolve
// against the nearest SVG viewport, i.e. this chart's own 200x200 viewBox —
// not the shape's own bounding box), so `transformOrigin: "center"` lands
// exactly on RADAR_CENTER regardless of the polygon's own asymmetric shape.

export const RADAR_GROW_TRANSITION = {
  duration: 900,
  easing: "ease-out",
} as const;

// ─── Data series shape (filled/stroked polygon + optional corner dots) ────

export interface RadarSeriesShapeProps {
  data: RadarPoint[];
  series: RadarSeriesConfig;
  count: number;
  maxValue: number;
  plotRadius?: number;
  showDots?: boolean;
  dotRadius?: number;
  /** Zero fill, visible stroke only (chartRadarLinesOnly). */
  strokeOnly?: boolean;
}

export function renderRadarSeriesShape(
  props: RadarSeriesShapeProps,
): DomphyElement<"g"> {
  const {
    data,
    series,
    count,
    maxValue,
    plotRadius = RADAR_PLOT_RADIUS,
    showDots = false,
    dotRadius = 3,
    strokeOnly = false,
  } = props;

  const points = data.map((point, index) => {
    const raw = Number(point[series.key]) || 0;
    const fraction = Math.max(0, Math.min(1, raw / maxValue));
    return radarPolarPoint(
      plotRadius * fraction,
      radarCategoryAngle(index, count),
    );
  });
  const fillOpacity = strokeOnly ? 0 : (series.fillOpacity ?? 0.6);

  const shapeElement: DomphyElement<"polygon"> = {
    polygon: null,
    points: points.map((point) => `${point.x},${point.y}`).join(" "),
    fill: (l: Listener) => themeColor(l, "shift-9", series.color),
    fillOpacity,
    stroke: (l: Listener) => themeColor(l, "shift-9", series.color),
    strokeWidth: 2,
    _key: `${series.key}-shape`,
  };

  const dotElements: DomphyElement[] = showDots
    ? points.map(
        (point, index) =>
          ({
            circle: null,
            cx: point.x,
            cy: point.y,
            r: dotRadius,
            fill: (l: Listener) => themeColor(l, "shift-9", series.color),
            stroke: "none",
            _key: `${series.key}-dot-${data[index].category}`,
          }) as DomphyElement<"circle">,
      )
    : [];

  return {
    g: [shapeElement, ...dotElements],
    style: { transformOrigin: "center" },
    $: [
      motion({
        initial: { scale: 0 },
        animate: { scale: 1 },
        transition: RADAR_GROW_TRANSITION,
      }),
    ],
    _key: series.key,
  };
}

// ─── Cursor-following tooltip (nearest-category detection, portal-free overlay) ──

export interface RadarTooltipEntry {
  key: string;
  label: string;
  color: ThemeColor;
  value: number;
}

interface RadarTooltipStateShape {
  visible: boolean;
  categoryLabel: string;
  entries: RadarTooltipEntry[];
  x: number;
  y: number;
}

export interface RadarTooltipController {
  state: State<RadarTooltipStateShape>;
  bindContainer: (element: HTMLElement | null) => void;
  show: (
    event: MouseEvent,
    categoryLabel: string,
    entries: RadarTooltipEntry[],
  ) => void;
  hide: () => void;
}

/** One tooltip controller per chart instance. Unlike the radial family (one hoverable
 * arc per ring), radar hover detection is a single nearest-spoke calculation over the
 * whole plot area, so there is no per-shape `.move()` — `.show()` is simply re-called
 * with a freshly resolved category on every mousemove. */
export function createRadarTooltip(): RadarTooltipController {
  const state = toState<RadarTooltipStateShape>({
    visible: false,
    categoryLabel: "",
    entries: [],
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
    show: (event, categoryLabel, entries) => {
      state.set({
        visible: true,
        categoryLabel,
        entries,
        ...positionFromEvent(event),
      });
    },
    hide: () => {
      const current = state.get();
      state.set({ ...current, visible: false });
    },
  };
}

export type RadarTooltipIndicator = "swatch" | "line" | "none";

export interface RadarTooltipLayerOptions {
  indicator?: RadarTooltipIndicator;
  showLabel?: boolean;
}

// Decorative color chip — carries no text of its own, but `color` is still set
// (far enough from `backgroundColor` to read as legible) so a themed
// `backgroundColor` never ships without a themed `color` alongside it.
// `_doctorDisable` is a doctor-only annotation not present in core's strict
// `PartialElement` type — build through an untyped literal, then assert.
// Exempt from tone-background-inherit: this chip must show the series' own
// fixed accent color (the whole point of a legend/tooltip swatch), not the
// ambient surface tone it would get from "inherit".
function radarIndicatorMark(
  color: ThemeColor,
  style: "swatch" | "line",
): DomphyElement<"span"> {
  const element = {
    span: null,
    _doctorDisable: "tone-background-inherit",
    style:
      style === "line"
        ? {
            display: "inline-block",
            width: themeSpacing(0.75),
            height: themeSpacing(3),
            borderRadius: themeSpacing(1),
            flexShrink: "0",
            backgroundColor: (l: Listener) => themeColor(l, "shift-9", color),
            color: (l: Listener) => themeColor(l, "shift-0", color),
          }
        : {
            display: "inline-block",
            width: themeSpacing(2.5),
            height: themeSpacing(2.5),
            borderRadius: themeSpacing(1),
            flexShrink: "0",
            backgroundColor: (l: Listener) => themeColor(l, "shift-9", color),
            color: (l: Listener) => themeColor(l, "shift-0", color),
          },
  };
  return element as DomphyElement<"span">;
}

/** Floating tooltip panel: an optional category heading, then one row per series
 * (indicator + label + value), or — when both `showLabel` and the indicator are off —
 * a bare value-only line (the grid-family recipes' minimal tooltip). */
export function radarTooltipLayer(
  tooltip: RadarTooltipController,
  series: RadarSeriesConfig[],
  options: RadarTooltipLayerOptions = {},
): DomphyElement<"div"> {
  const { indicator = "swatch", showLabel = true } = options;
  const children: DomphyElement[] = [];

  if (showLabel) {
    // Upstream's tooltipLabel is a `font-medium` heading in full foreground
    // (no muted class) — override small()'s neutral color back to foreground
    // and bump to medium weight.
    children.push({
      small: (l: Listener) => tooltip.state.get(l).categoryLabel,
      $: [small({ color: "neutral" })],
      style: {
        color: (l: Listener) => themeColor(l, "shift-9"),
        fontWeight: fixed("500"),
      },
    } as DomphyElement<"small">);
  }

  series.forEach((entry, index) => {
    const row: DomphyElement[] = [];
    if (indicator !== "none")
      row.push(radarIndicatorMark(entry.color, indicator));
    if (indicator !== "none" || series.length > 1) {
      // Series name: left-aligned, muted-foreground, normal weight (upstream's
      // `<span className="text-muted-foreground">`).
      row.push({
        small: entry.label,
        $: [small({ color: "neutral" })],
      } as DomphyElement<"small">);
    }
    // Value: pushed to the row's trailing edge (ml-auto), rendered `font-mono
    // font-medium text-foreground tabular-nums` per upstream ChartTooltipContent,
    // with `item.value.toLocaleString()` numeric formatting.
    row.push({
      small: (l: Listener) => {
        const value = tooltip.state.get(l).entries[index]?.value;
        return value == null ? "" : value.toLocaleString();
      },
      $: [small({ color: "neutral" })],
      style: {
        marginInlineStart: "auto",
        color: (l: Listener) => themeColor(l, "shift-9"),
        fontFamily: fixed("ui-monospace, monospace"),
        fontWeight: fixed("500"),
        fontVariantNumeric: "tabular-nums",
      },
    } as DomphyElement<"small">);
    children.push({
      div: row,
      style: { display: "flex", alignItems: "center", gap: themeSpacing(1.5) },
      _key: entry.key,
    });
  });

  return {
    div: children,
    dataTone: "shift-17",
    style: {
      position: "absolute",
      top: 0,
      left: 0,
      zIndex: "20",
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(1),
      // Upstream ChartTooltipContent panel is `min-w-[8rem]`.
      minWidth: "8rem",
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2.5),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
      backgroundColor: (l: Listener) => themeColor(l),
      color: (l: Listener) => themeColor(l, "shift-9"),
      pointerEvents: "none",
      whiteSpace: "nowrap",
      opacity: (l: Listener) => (tooltip.state.get(l).visible ? "1" : "0"),
      transform: (l: Listener) => {
        const current = tooltip.state.get(l);
        return `translate(${current.x + 14}px, ${current.y - 14}px)`;
      },
    },
  };
}

// ─── Full chart assembly (grid + radius axis + labels + series + tooltip) ──

export interface RadarChartProps {
  data: RadarPoint[];
  series: RadarSeriesConfig[];
  tooltip: RadarTooltipController;
  gridShape?: "polygon" | "circle" | "none";
  gridRingCount?: number;
  gridRingFractions?: number[];
  gridShowSpokes?: boolean;
  gridFill?: { color: ThemeColor; opacity: number } | null;
  showRadiusAxisLine?: boolean;
  radiusAxisAngle?: number;
  showDots?: boolean;
  dotRadius?: number;
  strokeOnly?: boolean;
  customLabels?: boolean;
  /** Plain month-name axis labels around the perimeter. Off = bare perimeter,
   * matching recipes that omit the angle axis entirely (chartRadarRadius). */
  showAngleLabels?: boolean;
  labelTopExtraOffset?: number;
  tooltipShowLabel?: boolean;
  tooltipIndicator?: RadarTooltipIndicator;
  /** Legend row rendered below the plot, nudged up via a negative margin (chartRadarLegend/Icons). */
  legend?: ChartLegendEntry[] | null;
  heightUnits?: number;
  plotRadius?: number;
}

/** The `svg` + tooltip overlay (+ optional legend) shared by every radar recipe. */
export function renderRadarChart(props: RadarChartProps): DomphyElement<"div"> {
  const {
    data,
    series,
    tooltip,
    gridShape = "polygon",
    gridRingCount = 4,
    gridRingFractions,
    gridShowSpokes = true,
    gridFill = null,
    showRadiusAxisLine = false,
    radiusAxisAngle = 60,
    showDots = false,
    dotRadius = 3,
    strokeOnly = false,
    customLabels = false,
    showAngleLabels = true,
    labelTopExtraOffset,
    tooltipShowLabel = true,
    tooltipIndicator = "swatch",
    legend = null,
    heightUnits = 62,
    plotRadius = customLabels ? RADAR_PLOT_RADIUS - 4 : RADAR_PLOT_RADIUS,
  } = props;

  const categories = data.map((point) => String(point.category));
  const count = categories.length;
  const maxValue = Math.max(
    1,
    ...data.flatMap((point) =>
      series.map((entry) => Number(point[entry.key]) || 0),
    ),
  );

  const gridElements =
    gridShape === "none"
      ? []
      : renderRadarGrid({
          categoryCount: count,
          shape: gridShape,
          ringCount: gridRingCount,
          ringFractions: gridRingFractions,
          showSpokes: gridShowSpokes,
          fill: gridFill ?? undefined,
          plotRadius,
        });

  const radiusAxisElements: DomphyElement[] = showRadiusAxisLine
    ? [radarRadiusAxisLine(plotRadius, radiusAxisAngle)]
    : [];

  const labelElements = customLabels
    ? renderRadarCustomLabels({
        data,
        series,
        plotRadius,
        topExtraOffset: labelTopExtraOffset,
      })
    : showAngleLabels
      ? renderRadarAngleLabels({
          categories,
          plotRadius,
          topExtraOffset: labelTopExtraOffset,
        })
      : [];

  const seriesGroups = series.map((entry) =>
    renderRadarSeriesShape({
      data,
      series: entry,
      count,
      maxValue,
      plotRadius,
      showDots,
      dotRadius,
      strokeOnly,
    }),
  );

  let containerElement: HTMLElement | null = null;
  const handleHover = (event: MouseEvent) => {
    if (!containerElement) return;
    const rect = containerElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = RADAR_VIEW_SIZE / rect.width;
    const localX = (event.clientX - rect.left) * scale;
    const localY = (event.clientY - rect.top) * scale;
    const categoryIndex = radarNearestCategoryIndex(
      radarAngleFromCenter(localX, localY),
      count,
    );
    const point = data[categoryIndex];
    const entries: RadarTooltipEntry[] = series.map((entry) => ({
      key: entry.key,
      label: entry.label,
      color: entry.color,
      value: Number(point[entry.key]) || 0,
    }));
    tooltip.show(event, categories[categoryIndex], entries);
  };

  const plotBoxStyle: Record<string, unknown> = {
    position: "relative",
    width: "100%",
    maxWidth: themeSpacing(heightUnits),
    aspectRatio: "1 / 1",
    maxHeight: themeSpacing(heightUnits),
    marginInline: "auto",
  };
  // Nudges the plot upward so the legend row underneath can sit close beneath
  // it instead of the container's default gap distance (chartRadarLegend/Icons).
  if (legend) plotBoxStyle.marginBottom = themeSpacing(-4);

  const plotBox: DomphyElement<"div"> = {
    div: [
      {
        svg: [
          ...gridElements,
          ...radiusAxisElements,
          ...labelElements,
          ...seriesGroups,
        ],
        viewBox: `0 0 ${RADAR_VIEW_SIZE} ${RADAR_VIEW_SIZE}`,
        style: {
          width: "100%",
          height: "100%",
          display: "block",
          overflow: "visible",
        },
      } as DomphyElement<"svg">,
      radarTooltipLayer(tooltip, series, {
        indicator: tooltipIndicator,
        showLabel: tooltipShowLabel,
      }),
    ],
    style: plotBoxStyle,
    onMouseMove: (event) => handleHover(event as MouseEvent),
    onMouseLeave: () => tooltip.hide(),
    _onMount(node) {
      containerElement = node.domElement as HTMLElement;
      tooltip.bindContainer(containerElement);
    },
    _onRemove() {
      containerElement = null;
      tooltip.bindContainer(null);
    },
  } as DomphyElement<"div">;

  if (!legend) return plotBox;

  const legendRow = chartLegendRow(legend);
  return {
    div: [
      plotBox,
      {
        ...legendRow,
        style: {
          ...(legendRow.style as Record<string, unknown>),
          paddingBlockStart: themeSpacing(5),
        },
      },
    ],
  };
}

// ─── Card shell (centered title/description, matching the family's own
// "centered CardHeader" visual spec — distinct from the left-aligned header
// every other chart family in this package uses) ───────────────────────────

export interface RadarCardShellProps {
  title: string;
  description: string;
  content: DomphyElement<"div">;
  footer?: DomphyElement<"footer">;
  /** Extra gap below the header block, matching upstream's `CardHeader pb-4`.
   * Most radar recipes carry it; chart-radar-dots and chart-radar-legend use a
   * plain `items-center` header with no pb-4, so they pass `false`. */
  headerPaddingBottom?: boolean;
}

export function radarCardShell(
  props: RadarCardShellProps,
): DomphyElement<"div"> {
  const {
    title,
    description,
    content,
    footer,
    headerPaddingBottom = true,
  } = props;
  const children: DomphyElement[] = [
    { h3: title, $: [heading()], style: { textAlign: "center" } },
    {
      p: description,
      $: [paragraph({ color: "neutral" })],
      style: {
        textAlign: "center",
        ...(headerPaddingBottom ? { marginBottom: themeSpacing(4) } : {}),
      },
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
