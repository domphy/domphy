// shadcn/ui "chart-radial-label" recipe — clean-room reimplementation.
//
// The same five-ring radial bar chart as chartRadialSimple, but every ring
// additionally sweeps across a domain that runs slightly past a full turn
// (with a floor so even the shortest ring keeps some length) and carries its
// own category name as a small always-visible label near the arc's leading
// edge.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { chartTrendFooter, type ChartTrendDirection } from "./chart-area-shared.js";
import {
  RADIAL_CHANNEL_DATA,
  createRadialTooltip,
  radialCardShell,
  renderRadialRingsChart,
  type RadialSeriesDatum,
} from "./chart-radial-shared.js";

export interface ChartRadialLabelProps {
  data?: RadialSeriesDatum[];
  title?: string;
  description?: string;
  trendText?: string;
  trendDirection?: ChartTrendDirection;
  captionText?: string;
  showBackgroundTrack?: boolean;
  showInlineLabels?: boolean;
  minSweepDegrees?: number;
  maxSweepDegrees?: number;
}

/**
 * shadcn/ui "chart-radial-label" recipe — five rings with inline category
 * labels near each arc's start. Call with no arguments for a working demo.
 */
function chartRadialLabel(props: ChartRadialLabelProps = {}): DomphyElement<"div"> {
  const {
    data = RADIAL_CHANNEL_DATA,
    title = "Radial Chart - Label",
    description = "January - June 2026",
    trendText = "Trending up by 5.2% this month",
    trendDirection = "up",
    captionText = "Showing total sessions by acquisition channel",
    showBackgroundTrack = true,
    showInlineLabels = true,
    minSweepDegrees,
    maxSweepDegrees,
  } = props;

  const tooltip = createRadialTooltip();

  return radialCardShell({
    title,
    description,
    content: {
      div: [
        renderRadialRingsChart({
          data,
          tooltip,
          showBackgroundTrack,
          showInlineLabels,
          sweepMode: "extended",
          minSweepDegrees,
          maxSweepDegrees,
        }),
      ],
    },
    footer: chartTrendFooter({ trendText, direction: trendDirection, captionText }),
  });
}

export { chartRadialLabel };
