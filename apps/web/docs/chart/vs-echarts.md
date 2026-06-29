---
title: "@domphy/chart vs ECharts"
description: "Detailed feature comparison between @domphy/chart and Apache ECharts — series types, rendering, color system, theme integration, bundle size."
---

# @domphy/chart vs ECharts

## Series coverage

| Series | @domphy/chart | ECharts |
|---|:---:|:---:|
| Line / Area | ✓ | ✓ |
| Bar (grouped, stacked, horizontal) | ✓ | ✓ |
| Scatter / Bubble | ✓ | ✓ |
| Pie / Donut / Rose | ✓ | ✓ |
| Radar / Spider | ✓ | ✓ |
| Heatmap (cartesian) | ✓ | ✓ |
| Heatmap (calendar) | ✓ | ✓ |
| Candlestick / OHLC | ✓ | ✓ |
| Boxplot / Whisker | ✓ | ✓ |
| Gauge | ✓ | ✓ |
| Treemap | ✓ | ✓ |
| Funnel | ✓ | ✓ |
| Sankey | ✓ | ✓ |
| Graph / Network | ✓ | ✓ |
| Parallel coordinates | ✓ | ✓ |
| ThemeRiver / Stream | ✓ | ✓ |
| Map / Choropleth | ✓ | ✓ |
| Custom render | ✓ | ✓ |
| scatter3D / bar3D / line3D | ✓ | ECharts GL |
| surface3D | ✓ (SVG) | ECharts GL (WebGL mesh) |
| Calendar coordinate | ✓ | ✓ |
| Geo coordinate | ✓ | ✓ |
| Polar coordinate | typed only (not rendered) | ✓ |
| ThemeRiver (multi-series) | ✓ | ✓ |
| Lines (flow map) | ✓ (SVG + animateMotion) | ✓ |
| EffectScatter | ✓ (SVG ripple animation) | ✓ |
| PictorialBar | ✓ (SVG symbol repeat/clip) | ✓ |

## Architecture

| | @domphy/chart | ECharts |
|---|---|---|
| **Renderer** | WebGL (luma.gl) for hot series + SVG overlay for everything else | Canvas (default) or SVG mode — no mixed mode |
| **3D** | SVG perspective projection (built-in, no extra package) | ECharts GL (separate npm package, WebGL) |
| **Framework** | Domphy patch — integrates into element tree | Standalone (`echarts.init(dom)`) |
| **Reactivity** | Pass `State<ChartOption>` — auto re-renders on change | Call `setOption()` manually |
| **SSR** | Works with `@domphy/app renderToString` | Partial (SVG mode only) |
| **Shadow DOM** | ✓ (SVG output, no canvas clipping issues) | Canvas has shadow DOM issues |

## Color system

This is the biggest architectural difference.

**ECharts** hardcodes palette hex values:
```ts
// ECharts default — breaks in dark mode, no contrast guarantee
color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', ...]
```

**@domphy/chart** uses theme families that resolve at render time:
```ts
// Adapts to any dataTone context, WCAG 4.5:1 guaranteed
series: [
  { type: "line", color: "primary" },    // resolves via themeColor()
  { type: "bar",  color: "secondary" },  // follows dataTone cascade of parent
]
```

Set `dataTone="shift-14"` on the chart container → all series colors adapt to the dark tone automatically. Zero manual dark-mode config.

## Spacing / density cascade

| | @domphy/chart | ECharts |
|---|---|---|
| Axis label padding | `themeSpacing(density * n)` | Fixed px |
| Tick density | cascade from `dataDensity` | Fixed |
| Legend gap | cascade | Fixed |
| Compact mode | `dataDensity="decrease-1"` on parent | No built-in |

## Components

| Component | @domphy/chart | ECharts |
|---|:---:|:---:|
| Title | ✓ | ✓ |
| Legend (plain/scroll) | ✓ | ✓ |
| Tooltip (axis/item) | ✓ (Domphy element or string) | ✓ (HTML or richText) |
| DataZoom (slider/inside) | ✓ | ✓ |
| VisualMap (continuous/piecewise) | ✓ | ✓ |
| Brush | ✓ (option type) | ✓ |
| Toolbox | ✓ (option type) | ✓ |
| Mark point/line/area | ✓ | ✓ |
| Dataset + transforms | ✓ | ✓ |
| Axis pointer | ✓ | ✓ |
| Geo roam (interactive pan/zoom) | static (`zoom`/`center` only) | ✓ |

## Bundle size

| | @domphy/chart | ECharts (tree-shaken) | ECharts (full) |
|---|---|---|---|
| Core | ~120 KB | ~400 KB | ~1 MB |
| 3D | built-in (SVG, 0 extra) | +ECharts GL ~800 KB | — |
| Peer deps | @domphy/core, @domphy/theme | none | none |

## Migration from ECharts

The `ChartOption` interface is intentionally ECharts-compatible. Most options migrate without changes:

```ts
// ECharts
echarts.init(document.getElementById("chart")).setOption({
  xAxis: { type: "category", data: ["Mon","Tue","Wed"] },
  yAxis: { type: "value" },
  series: [{ type: "bar", data: [120, 200, 150] }],
})

// @domphy/chart — same option object, different mount
import { chart } from "@domphy/chart"
const App = {
  div: null,
  style: { width: "600px", height: "300px" },
  $: [chart({
    xAxis: { type: "category", data: ["Mon","Tue","Wed"] },
    yAxis: { type: "value" },
    series: [{ type: "bar", data: [120, 200, 150] }],
  })],
}
```

**Key differences when migrating:**
- `color` in series takes a `ThemeFamily` string (`"primary"`) not a hex — drop hex colors and let the theme system assign them, or keep hex in `itemStyle.color`
- No `echarts.init()` — use the `chart()` patch directly
- No `setOption()` — pass a `State<ChartOption>` for reactive updates
- `tooltip.formatter` can return a `DomphyElement` (plain object) in addition to a string
