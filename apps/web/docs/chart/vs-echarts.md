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
| Custom render (`custom` + `renderItem`) | ✓ (cartesian2d/none — group/rect/circle/polygon/polyline/line/text; polar/geo custom series not rendered) | ✓ |
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
| **Accessibility** | overlay SVG is `role="img"` with a derived `aria-label`; legend items are APG toggle buttons (focusable, `aria-pressed`, Enter/Space) | `aria` component, opt-in `aria.enabled` |
| **WebGL context loss** | recovered automatically (fresh canvas + device) | n/a (Canvas 2D) |

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
| Brush (rect/lineX/lineY, single/multiple, `brushSelected`, `inBrush`/`outOfBrush`) | ✓ (scatter/line incl. stacked/bar/candlestick; `polygon` not implemented) | ✓ |
| Toolbox (saveAsImage incl. `type:"svg"` / restore / dataView / dataZoom / brush / magicType) | ✓ | ✓ |
| Mark point/line/area | ✓ | ✓ |
| Dataset + transforms | ✓ | ✓ |
| Axis pointer | ✓ | ✓ |
| Geo roam (interactive pan/zoom) | ✓ (drag + wheel, `scaleLimit`) | ✓ |
| Enter/update animation (`animation*`) | typed only (static render; `effectScatter`/`lines` have own SVG effects) | ✓ |

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

## Option keys typed for interop that have no effect

The `ChartOption` type is deliberately ECharts-shaped so a pasted option
compiles. Some of those keys are not rendered. The table below is **measured,
not curated**: `packages/chart/scripts/inert-keys.mjs` walks `src/` at run time
and looks for a read of each key declared in `types.ts` (as `.key`, `["key"]`,
`['key']` or a template-literal reference). Measured 2026-09: **410 of 1549 key
declarations (202 of 443 distinct key names) have no reader anywhere in
`src/`.**

Every one of them carries a `@deprecated Not implemented by @domphy/chart`
JSDoc marker on its declaration in the published types, so an editor strikes
the key through at the call site instead of letting it look supported.
`node packages/chart/scripts/mark-inert-keys.mjs` re-derives those markers, and
`packages/chart/tests/inert-keys-honest.test.ts` fails if a marker and the
source grep ever disagree.

Setting one of the **bold** keys additionally logs a one-time console warning
at runtime.

| Type | # | Keys with no effect |
|---|---:|---|
| `LabelOption` | 2 | `verticalAlign`, `borderRadius` |
| `LineStyleOption` | 1 | `dashOffset` |
| `ItemStyleOption` | 2 | `borderType`, `borderRadius` |
| `LinearGradient` | 1 | `global` |
| `RadialGradient` | 1 | `global` |
| `AreaStyleOption` | 1 | `origin` |
| `EmphasisOption` | 1 | **`labelLine`** |
| `LabelLineOption` | 3 | `showAbove`, `length2`, `minTurnAngle` |
| `MarkPointOption` | 2 | `emphasis`, `animationDuration` |
| `MarkLineOption` | 2 | `precision`, `emphasis` |
| `MarkAreaOption` | 1 | `emphasis` |
| `AxisLabelOption` | 4 | `inside`, `verticalAlign`, `ellipsis`, `hideOverlap` |
| `AxisLineOption` | 2 | `onZero`, `onZeroAxisIndex` |
| `AxisTickOption` | 2 | `alignWithLabel`, `inside` |
| `AxisPointerOption` | 3 | `snap`, `shadowStyle`, `status` |
| `AxisOption` | 11 | `gridIndex`, `polarIndex`, `nameTextStyle`, `nameGap`, `nameRotate`, `minInterval`, `maxInterval`, `triggerEvent`, `minorTick`, `minorSplitLine`, `splitArea` |
| `RadiusAxisOption` | 1 | `polarIndex` |
| `AngleAxisOption` | 1 | `polarIndex` |
| `GridOption` | 1 | `containLabel` |
| `TitleOption` | 6 | `link`, `sublink`, `subtarget`, `textVerticalAlign`, `triggerEvent`, `borderRadius` |
| `LegendOption` | 14 | `symbolKeepAspect`, `selectedMode`, `inactiveColor`, `inactiveBorderColor`, `inactiveBorderWidth`, `borderRadius`, `pageButtonItemGap`, `pageButtonGap`, `pageButtonPosition`, `pageIconColor`, `pageIconInactiveColor`, `pageIconSize`, `pageTextStyle`, `animationDurationUpdate` |
| `TooltipOption` | 8 | **`showContent`**, **`alwaysShowContent`**, **`triggerOn`**, **`showDelay`**, **`hideDelay`**, **`enterable`**, **`renderMode`**, **`transitionDuration`** |
| `TooltipParams` | 7 | `marker`, `axisDim`, `axisIndex`, `axisType`, `axisId`, `axisValue`, `axisValueLabel` |
| `DataZoomSliderOption` | 29 | `radiusAxisIndex`, `angleAxisIndex`, `filterMode`, `startValue`, `endValue`, `minSpan`, `maxSpan`, `minValueSpan`, `maxValueSpan`, `zoomLock`, `throttle`, `rangeMode`, `borderRadius`, `dataBackground`, `selectedDataBackground`, `fillerColor`, `handleColor`, `handleStyle`, `handleSize`, `handleIcon`, `moveHandleStyle`, `moveHandleSize`, `labelPrecision`, `labelFormatter`, `showDetail`, `showDataShadow`, `realtime`, `brushSelect`, `emphasis` |
| `DataZoomInsideOption` | 12 | `filterMode`, `startValue`, `endValue`, `minSpan`, `maxSpan`, `zoomLock`, `throttle`, `rangeMode`, `zoomOnMouseWheel`, `moveOnMouseMove`, `moveOnMouseWheel`, `preventDefaultMouseMove` |
| `VisualMapContinuousOption` | 12 | `calculable`, `realtime`, `precision`, `textGap`, `hoverLink`, `controller`, `handleIcon`, `handleSize`, `handleStyle`, `indicatorIcon`, `indicatorSize`, `indicatorStyle` |
| `VisualMapPiecewiseOption` | 9 | `minOpen`, `maxOpen`, `selectedMode`, `precision`, `textGap`, `showLabel`, `itemSymbol`, `hoverLink`, `controller` |
| `BrushOption` | 5 | `brushLink`, `transformable`, `throttleType`, `throttleDelay`, `removeOnClick` |
| `DatasetOption` | 2 | **`dimensions`**, `fromTransformResult` |
| `TransformOption` | 1 | `print` |
| `EncodeOption` | 2 | `itemId`, `itemGroupId` |
| `LineSeriesOption` | 19 | `polarIndex`, `symbolKeepAspect`, `showAllSymbol`, `hoverAnimation`, `stackStrategy`, **`clip`**, **`endLabel`**, **`labelLayout`**, `smoothMonotone`, `sampling`, **`dimensions`**, **`seriesLayoutBy`**, `animationThreshold`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate` |
| `BarSeriesOption` | 22 | `polarIndex`, `coordinateSystemIndex`, **`labelLayout`**, `stackStrategy`, `barMinAngle`, `largeThreshold`, `progressiveThreshold`, `progressiveChunkMode`, **`dimensions`**, **`seriesLayoutBy`**, **`clip`**, **`realtimeSort`**, **`showBackground`**, **`backgroundStyle`**, `animationThreshold`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate`, `borderRadius` |
| `PieDataItem` | 4 | **`labelLine`**, `emphasis`, `blur`, `select` |
| `PieSeriesOption` | 17 | `minAngle`, `minShowLabelAngle`, **`avoidLabelOverlap`**, `stillShowZeroSum`, `percentPrecision`, **`dimensions`**, **`seriesLayoutBy`**, **`labelLine`**, **`labelLayout`**, `animationThreshold`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate`, `borderRadius` |
| `ScatterSeriesOption` | 12 | `polarIndex`, `symbolKeepAspect`, `largeThreshold`, **`labelLayout`**, `progressiveThreshold`, `progressiveChunkMode`, **`dimensions`**, **`seriesLayoutBy`**, `animationThreshold`, `animationDuration`, `animationEasing`, `animationDelay` |
| `RadarOption` | 4 | `axisName`, `nameGap`, `triggerEvent`, `splitArea` |
| `RadarSeriesOption` | 5 | `symbolKeepAspect`, **`labelLayout`**, `animationDuration`, `animationEasing`, `animationDelay` |
| `HeatmapSeriesOption` | 7 | `blurSize`, `pointSize`, `maxOpacity`, `minOpacity`, **`dimensions`**, **`seriesLayoutBy`**, `progressiveThreshold` |
| `CandlestickSeriesOption` | 14 | `largeThreshold`, `progressiveThreshold`, `progressiveChunkMode`, **`dimensions`**, **`seriesLayoutBy`**, **`clip`**, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate`, `upBorderColor`, `downBorderColor` |
| `BoxplotSeriesOption` | 6 | `boxWidth`, **`dimensions`**, **`seriesLayoutBy`**, `animationDuration`, `animationEasing`, `animationDelay` |
| `GaugeSeriesOption` | 4 | `anchor`, `animationDuration`, `animationEasing`, `animationDelay` |
| `TreemapLevelOption` | 12 | `visualDimension`, `visualMin`, `visualMax`, `colorAlpha`, `colorSaturation`, `colorMappingBy`, `visibleMin`, `childrenVisibleMin`, `upperLabel`, `emphasis`, `blur`, `select` |
| `TreemapDataItem` | 7 | `groupId`, `childGroupId`, `upperLabel`, `emphasis`, `blur`, `select`, `link` |
| `TreemapSeriesOption` | 27 | `squareRatio`, `leafDepth`, `drillDownIcon`, `nodeClick`, `zoomToNodeRatio`, `universalTransition`, `visualDimension`, `visualMin`, `visualMax`, `colorAlpha`, `colorSaturation`, `colorMappingBy`, `visibleMin`, `childrenVisibleMin`, `upperLabel`, `emphasis`, `blur`, `select`, `selectedMode`, `breadcrumb`, `levels`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate` |
| `FunnelDataItem` | 4 | **`labelLine`**, `emphasis`, `blur`, `select` |
| `FunnelSeriesOption` | 10 | `minSize`, `maxSize`, `funnelAlign`, **`labelLine`**, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate` |
| `SankeyNode` | 4 | `emphasis`, `blur`, `select`, `focusNodeAdjacency` |
| `SankeyLink` | 4 | `emphasis`, `blur`, `select`, `focusNodeAdjacency` |
| `SankeySeriesOption` | 14 | `nodeAlign`, `draggable`, `selectedMode`, `levels`, `emphasis`, `blur`, `select`, `focusNodeAdjacency`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate` |
| `GraphNode` | 4 | `draggable`, `emphasis`, `blur`, `select` |
| `GraphLink` | 4 | `emphasis`, `blur`, `select`, `ignoreForceLayout` |
| `GraphCategory` | 3 | `emphasis`, `blur`, `select` |
| `GraphSeriesOption` | 18 | `legendHoverLink`, `polarIndex`, `circular`, `draggable`, `edgeSymbolSize`, `edgeLabel`, **`labelLayout`**, `emphasis`, `blur`, `select`, `selectedMode`, `autoCurveness`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate` |
| `CustomRenderParams` | 2 | `dataIndexInside`, `actionType` |
| `CustomElement` | 2 | `textConfig`, `during` |
| `CustomSeriesOption` | 6 | `polarIndex`, **`dimensions`**, **`seriesLayoutBy`**, `animationDuration`, `animationEasing`, `emphasis` |
| `ParallelAxisOption` | 1 | `parallelIndex` |
| `ParallelSeriesOption` | 1 | `parallelIndex` |
| `MapSeriesOption` | 3 | `nameProperty`, `selectedMode`, `emphasis` |
| `Grid3DOption` | 3 | `boxWidth`, `boxHeight`, `boxDepth` |
| `Scatter3DSeriesOption` | 1 | `grid3DIndex` |
| `Bar3DSeriesOption` | 1 | `grid3DIndex` |
| `Line3DSeriesOption` | 1 | `grid3DIndex` |
| `Surface3DSeriesOption` | 1 | `grid3DIndex` |
| `EffectScatterSeriesOption` | 1 | `showEffectOn` |
| `ChartOption` | 13 | `radiusAxis`, `angleAxis`, `animationThreshold`, `animationDuration`, `animationEasing`, `animationDelay`, `animationDurationUpdate`, `animationEasingUpdate`, `animationDelayUpdate`, `progressiveThreshold`, `blendMode`, `hoverLayerThreshold`, `useUTC` |

`option.brush` (rect/lineX/lineY drag-select, `brushSelected`) IS implemented
— see [Brush](/docs/chart/axes#brush) — but only `brushType: "rect"` |
`"lineX"` | `"lineY"` render; a `"polygon"` value (in `brush.brushType` or
`toolbox.feature.brush.type`) warns at runtime without showing up in the
table as a single key. A `custom` series' `renderItem` IS called — see
[Custom series](/docs/chart/series#custom-series-renderitem) — but only for
`coordinateSystem: "cartesian2d"` (the default) or `"none"`; `"polar"`/`"geo"`
custom series are typed but not rendered, and warn instead. Top-level
`radiusAxis`/`angleAxis` are inert because polar series are not rendered —
the polar coordinate math exists but nothing draws through it.

The `animation*`, `progressiveThreshold` and `largeThreshold` keys are
deliberately **not** warned about at runtime: they change timing or a
performance hint rather than what is drawn, and warning on them would fire on
nearly every pasted ECharts option. (`z`, `zlevel` and `silent` are no longer on
this list — they are read.)

**Key differences when migrating:**
- `color` in a series accepts a `ThemeFamily` string (`"primary"`) as well as the `"#hex"` / `"rgb()"` / `"var(--…)"` values ECharts takes. Prefer the family name so the series follows the theme; an omitted color falls back to the palette entry for the series' index in `option.series`.
- No `echarts.init()` — use the `chart()` patch directly
- No `setOption()` — pass a `State<ChartOption>` for reactive updates
- `tooltip.formatter` can return a `DomphyElement` (plain object) in addition to a string
- `chart.on("click", …)` is `chart(option, { click })` on the patch, or `engine.on("click", …)` on `ChartEngine`. `selectchanged` and `brushSelected` are wired the same way; those three are the only events.
- `emphasis` / `blur` / `select` / `selectedMode` work on **line, bar, scatter, pie, radar, heatmap, candlestick, gauge, boxplot and funnel**, at series level (not per data item), and are opt-in — see [Interaction & Events](/docs/chart/events#emphasis-blur-and-select). Per-datum mouse hover/click hit-testing reaches all ten (heatmap cell rect, candlestick/boxplot body+wick box, radar polygon, funnel trapezoid, gauge progress arc — each the same geometry its renderer paints from). On every other series type the keys are still inert and marked `@deprecated`.
