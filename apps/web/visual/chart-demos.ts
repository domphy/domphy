/**
 * Demos for the @domphy/chart Playwright spec (chart.spec.ts), solo-mounted
 * via the standalone catalog's `?catalog=chart&only=<name>` mode. Each entry
 * is a docs demo as-is — one chart (one WebGL context) per page.
 *
 * Representative coverage: WebGL line+area with axis tooltip, stacked WebGL
 * bars with legend toggling, WebGL pie/donut with item tooltip, WebGL
 * heatmap, and a dataZoom slider for drag interaction.
 */
import type { DomphyElement } from "@domphy/core";

export const chartDemoLoaders: Record<
  string,
  () => Promise<{ default: DomphyElement }>
> = {
  lineArea: () => import("../docs/demos/chart/LineArea.js"),
  barStacked: () => import("../docs/demos/chart/BarStacked.js"),
  pieDonut: () => import("../docs/demos/chart/PieDonut.js"),
  heatmapCartesian: () => import("../docs/demos/chart/HeatmapCartesian.js"),
  dataZoom: () => import("../docs/demos/chart/DataZoom.js"),
};
