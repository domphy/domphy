// shadcn/ui "chart-radial-grid" recipe — clean-room reimplementation.
//
// The same five-ring radial bar chart as chartRadialSimple, but the solid
// per-ring background track is swapped for recharts' <PolarGrid
// gridType="circle" />: one thin concentric gridline per category band
// (aligned to the ring radii) plus, from recharts' default radialLines={true},
// evenly spaced radial spoke lines running from the inner radius out to the
// outer radius. The hover tooltip mirrors <ChartTooltipContent hideLabel
// nameKey="browser" /> — a color swatch, the series name, and its numeric
// value (e.g. "Chrome 275").
//
// The rings/grid/spokes are composed from the same shared radial primitives
// the other recipes use; only this file's element tree is bespoke.

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADIAL_CENTER,
  RADIAL_CHANNEL_DATA,
  RADIAL_VIEW_SIZE,
  computeRingLayout,
  createRadialTooltip,
  polarPoint,
  radialArcPath,
  radialCardShell,
  radialSeriesColor,
  radialThinCircle,
  radialTooltipLayer,
  type RadialSeriesDatum,
} from "./chart-radial-shared.js";

export interface ChartRadialGridProps {
  data?: RadialSeriesDatum[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  /** Radial spoke lines (recharts PolarGrid radialLines), evenly spaced. */
  spokeCount?: number;
  /** Concentric gridline count. Defaults to one ring per category band. */
  gridCircleCount?: number;
  outerRadius?: number;
}

/**
 * shadcn/ui "chart-radial-grid" recipe — five rings over a polar grid
 * (concentric band circles + radial spokes) instead of solid background
 * tracks. Call with no arguments for a working demo.
 */
function chartRadialGrid(props: ChartRadialGridProps = {}): DomphyElement<"div"> {
  const {
    data = RADIAL_CHANNEL_DATA,
    title = "Radial Chart - Grid",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total sessions by acquisition channel",
    spokeCount = 4,
    gridCircleCount,
    outerRadius = 82,
  } = props;

  const innerRadius = outerRadius * 0.25;
  const ringGap = 2;
  const cx = RADIAL_CENTER;
  const cy = RADIAL_CENTER;

  const rings = computeRingLayout(data.length, outerRadius, innerRadius, ringGap);
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const tooltip = createRadialTooltip();

  const gridElements: DomphyElement[] = [];

  // <PolarGrid gridType="circle" />: concentric gridlines. By default one per
  // category band, sitting on each ring radius so the grid aligns with the
  // bars; an explicit gridCircleCount overrides with that many evenly spaced.
  const gridRadii =
    gridCircleCount == null
      ? rings.map((ring) => ring.radius)
      : Array.from({ length: gridCircleCount }, (_, index) => {
          const denominator = Math.max(1, gridCircleCount - 1);
          return innerRadius + ((outerRadius - innerRadius) / denominator) * index;
        });
  gridRadii.forEach((radius, index) => {
    gridElements.push({ ...radialThinCircle(cx, cy, radius, "muted"), _key: `grid-ring-${index}` });
  });

  // radialLines={true} default: evenly spaced spokes from inner to outer radius.
  for (let index = 0; index < spokeCount; index++) {
    const angle = (360 / spokeCount) * index;
    const start = polarPoint(cx, cy, innerRadius, angle);
    const end = polarPoint(cx, cy, outerRadius, angle);
    gridElements.push({
      line: null,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      fill: "none",
      stroke: (listener: Listener) => themeColor(listener, "shift-3"),
      strokeWidth: 1,
      _key: `grid-spoke-${index}`,
    } as DomphyElement<"line">);
  }

  const arcElements: DomphyElement[] = data.map((point, index) => {
    const ring = rings[index];
    const color = radialSeriesColor(index, point.color);
    const sweep = (point.value / maxValue) * 360;
    return radialArcPath({
      cx,
      cy,
      radius: ring.radius,
      thickness: ring.thickness,
      startAngleDeg: 0,
      endAngleDeg: sweep,
      color,
      tooltip,
      // ChartTooltipContent (hideLabel nameKey="browser") = swatch + name +
      // right-aligned numeric value; the shared tooltip now threads the value
      // through and renders it after the label.
      tooltipLabel: point.label,
      tooltipValue: point.value,
      seriesKey: point.key,
    });
  });

  const chart: DomphyElement<"div"> = {
    div: [
      {
        svg: [...gridElements, ...arcElements],
        viewBox: `0 0 ${RADIAL_VIEW_SIZE} ${RADIAL_VIEW_SIZE}`,
        style: { width: "100%", height: "100%", display: "block", overflow: "visible" },
      } as DomphyElement<"svg">,
      radialTooltipLayer(tooltip),
    ],
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
      maxHeight: themeSpacing(72),
      marginInline: "auto",
    },
    _onMount(node) {
      tooltip.bindContainer(node.domElement as HTMLElement);
    },
    _onRemove() {
      tooltip.bindContainer(null);
    },
  } as DomphyElement<"div">;

  return radialCardShell({
    title,
    description,
    content: { div: [chart] },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadialGrid };
