# @domphy/chart Changelog

## 0.4.1

- Republish of 0.4.0 with no code change: the 0.4.0 tarball was published with raw `workspace:` dependency specifiers (published with `npm publish` instead of `pnpm publish`), so it could not be installed outside this monorepo. 0.4.0 is deprecated on npm.

## 0.4.0

Correctness, interaction and accessibility pass, verified in Chromium.

**Typed-but-inert options implemented** — an advertised option that is silently
ignored is a lie; these now have an effect.
- `toolbox` is implemented: `saveAsImage`, `restore`, `dataView`, `dataZoom`
  (drag-select on x and y), `brush` and `magicType`, rendered as a
  keyboard-operable `role="toolbar"` of `<button>`s with `aria-label`s and a
  focus ring. `toolbox.feature.dataZoom` gained ECharts'
  `xAxisIndex`/`yAxisIndex`. `saveAsImage`'s `type: "svg"` produces a real
  SVG document (background/overlay vector layers plus the WebGL series
  embedded as one raster `<image>`, `xlink:href` **and** the bare SVG2
  `href` so both older and newer SVG consumers resolve it) instead of
  silently falling back to a PNG; `type: "png"`/`"jpg"` composite the same
  three layers onto a canvas — both verified pixel-exact against the live
  WebGL canvas in Chromium (`GL.readPixels` at a sampled coordinate byte-for-
  byte equal to the exported image's decoded pixel there).
- **Geo/map `roam`**: drag to pan, wheel to zoom about the cursor, with
  ECharts' `scaleLimit`. `MapSeriesOption` gained the `roam`/`scaleLimit`/
  `center`/`zoom` keys it was missing, and a bare `map` series now builds its
  implicit geo component from its own keys.
- **Geo/map `itemStyle`** (`areaColor`/`borderColor`/`borderWidth`/`opacity`),
  at component, `geo.regions[]` and data-item level, in ECharts' precedence.
  The typed shape is the new `GeoItemStyleOption` (ECharts spells the region
  fill `areaColor`, not `color`).
- **`lineStyle.curveness`** on `lines` (per series and per data item), plus the
  series/item `lineStyle` `color`/`width`/`opacity` that were dropped.
- **`effectScatter`**: `color`, `itemStyle` and `label`.
- **`pictorialBar`**: `color`, `itemStyle` (series and data item), `colorBy`,
  `label`, `symbolMargin`, `barWidth`/`barMaxWidth`/`barMinWidth`,
  `barCategoryGap`, and now **`barGap`**: pictorialBar series sharing an
  x/y axis pair get their own column in the category band (ECharts'
  `calBarWidthAndOffset`), instead of every series drawing its symbol
  centered on the same category and fully overlapping.
- **Bar sizing**: `barWidth`, `barMaxWidth`, `barMinWidth`, `barGap`,
  `barCategoryGap`, `barMinHeight` are read, via one shared
  `coord/barLayout.ts` used by both the renderer and the labels. A chart
  mixing a grouped series with a stacked one on the same category band now
  gives the stack its own column (`grouped.length + stacks.length` columns
  total), instead of the stack taking the whole band.
- **`heatmap.itemStyle`**: `opacity`, `borderWidth`, `borderColor`.
- **3D series**: `itemStyle` (scatter3D/bar3D/surface3D), `label`
  (scatter3D/bar3D), `lineStyle` (line3D) and `shading: "lambert"`
  (bar3D/surface3D). `shading: "lambert"` on a theme color (`itemStyle.color:
  "primary"`, a `var(--…)` reference at paint time) now shades a real
  multiplied color instead of a CSS `brightness()` filter approximation — the
  engine's per-render-pass `ColorResolver` (already threaded through every
  other WebGL renderer) is now also threaded into `renderGrid3D`.
- **`toolbox.feature.dataZoom` zooms the y axis too**: the rectangle-select
  drag reads both the horizontal and vertical span and produces an x window,
  a y window, or both, matching whichever edges you actually dragged.
  `xAxisIndex: "none"`/`false` zooms y only, `yAxisIndex: "none"`/`false`
  zooms x only (as before); setting both disables the feature. The
  coordinate math (`coord/grid.ts`) already supported a y zoom window —
  nothing had ever produced one. The standalone `dataZoom` component (not
  `toolbox`) also seeds its initial y window from `yAxisIndex` now.
- **`custom` series (`renderItem`)** is implemented for `coordinateSystem:
  "cartesian2d"` (the default) and `"none"` — `polar`/`geo` custom series are
  still typed only and warn. `api.value`/`ordinalRawValue`/`coord`/`size`/
  `style`/`styleEmphasis`/`visual`/`currentSeriesIndices`/`font`/`getWidth`/
  `getHeight`/`getDevicePixelRatio` are implemented; the returned element
  tree supports `group`/`rect`/`circle`/`polygon`/`polyline`/`line`/`text`
  (`shape`/`style`/`x`/`y`/`scaleX`/`scaleY`/`rotation`/`originX`/`originY`/
  `children`/`textContent`). See [Custom series](/docs/chart/series#custom-series-renderitem).
- **`option.brush`** (rect/lineX/lineY drag-select) and **`toolbox.feature.
  brush`** are implemented: `brushMode` "single" (replaces the area on each
  drag) or "multiple" (accumulates, selection is their union), `brushType`
  defaults to `"rect"` and is drag-active immediately with no toolbox
  required, `brushStyle` paints the drawn area, and a completed drag fires
  the new `brushSelected` event (`chart(option, { brushSelected })` /
  `engine.on("brushSelected", …)`) with the ECharts-shaped batch. Hit-tested
  series: scatter, line (including a **stacked** line, tested against its
  cumulative position — `coord/grid.ts`'s `accumStackedLines()`), bar (any
  grouped/stacked/horizontal/vertical layout, via the single geometry source
  `coord/barPositions.ts#layoutBarSeries()` the renderer itself paints from)
  and candlestick (body + wick bounding box,
  `coord/barPositions.ts#layoutCandlestickSeries()`). boxplot/heatmap/pie
  are not (their rendered position depends on renderer-specific layout math
  this pass does not duplicate); getting a data index wrong is worse than
  not selecting it. **`inBrush`/`outOfBrush`** dim the un-brushed points on
  every hit-tested series (default: brushed-in stays full opacity, everything
  else in a brushable series fades to `opacity: 0.3`, both overridable) —
  reusing the same `ItemStateResolver` plumbing emphasis/blur/select runs on
  (`itemStates.ts#createBrushStates()`), including a line's own per-point
  symbols. `polygon` (in `brush.brushType` or `toolbox.
  feature.brush.type`) is typed but warns instead of rendering; `brushLink`,
  `transformable`, `throttleType`/`throttleDelay`, `removeOnClick`, and
  `seriesIndex`/`xAxisIndex`/`yAxisIndex` scoping (every eligible series is
  always hit-tested) are not implemented. See [Brush](/docs/chart/axes#brush).

**Breaking / visual**
- Bar geometry now follows ECharts' documented defaults (`barCategoryGap` 20%,
  `barGap` 30%): a single-series bar is 0.80 of the category band, not 0.65;
  grouped bars are `0.80 · band / (n + 0.3(n-1))` with a `0.3 · barSize` gap
  instead of a fixed 2px one.
- `lines` arcs default to `curveness: 0` (straight), as in ECharts. Charts that
  relied on the old always-curved rendering must set `lineStyle.curveness`.
- Geo regions, borders and labels are painted from the theme neutral ramp
  instead of the literal `#e0e0e0`/`#999`/`#333`, which were invisible on a
  dark theme.
- A map/geo `label: { show: false }` is now honoured on regions that carry a
  value (they used to get a label anyway).
- `bevelSize`/`bevelSmoothness` on 3D series are **not** supported and are not
  typed.

**Interaction states (`emphasis` / `blur` / `select`)**
- Implemented for **line, bar, scatter, pie, radar, heatmap, candlestick,
  gauge, boxplot and funnel**, following the ECharts option
  reference: `emphasis.focus` (`"none"` | `"self"` | `"series"`),
  `emphasis.blurScope` (`"coordinateSystem"` | `"series"` | `"global"`),
  `emphasis.itemStyle` / `scale` / `scaleSize` / `label` / `disabled`,
  `blur.itemStyle.opacity` (default `0.1`), `select.itemStyle`, a pie's
  `selectedOffset`, and `selectedMode`
  (`"single"` | `"multiple"` | `"series"` | `false`). With nothing declared the
  emphasised colour is lifted 10%, as ECharts' `liftColor` does.
- They are **opt-in**: unless a series declares one of those keys the chart is
  not hover-tracked and never re-renders on pointer move. Per-datum mouse
  hover/click hit-testing is the tooltip's own — one source, so a hovered
  datum cannot be highlighted in one and missed in the other — and now covers
  **all ten** series types: heatmap (cell rect), candlestick (the same
  body+wick bounding box `coord/barPositions.ts#layoutCandlestickSeries()`
  shares with the renderer and brush), boxplot (whisker-to-whisker box,
  `overlay/boxplot.ts#computeBoxplotLayout()`), radar (point-in-polygon,
  `gl/RadarRenderer.ts#computeRadarPolygons()`), funnel (point-in-trapezoid,
  `overlay/funnel.ts#computeFunnelLayout()`) and gauge (annulus + angular
  sweep against the progress arc, `gl/GaugeRenderer.ts#computeGaugeArcs()`).
  Each of those five geometry functions is the SAME one its renderer paints
  from, extracted once and shared, so a hover/click can never land on a shape
  different from what is on screen. Legend hover/focus (blurs every other
  series while the pointed-at one stays normal) remains available for
  whole-series highlighting on top of per-datum hover/click.
- **boxplot and funnel are SVG-only overlays with no theme-aware colour
  resolver** (their stroke/fill is a static `seriesColor()` hex, not a
  `var(--…)` reference) — for these two only the state's **opacity** delta
  applies (a whole shape's `<g opacity>`/a polygon's `opacity`), not the
  `lift` multiplier or an explicit `itemStyle.color` override the other eight
  series types get through the pass's `ColorResolver`.
- Pointing at *or keyboard-focusing* a legend item highlights its series
  (ECharts `legendHoverLink`), so <kbd>Tab</kbd> reaches the same affordance
  as the mouse.
- New `selectchanged` event on the `chart()` patch and `ChartEngine.on()`, with
  ECharts' payload (`fromAction`, `selected: [{ seriesIndex, dataIndex[] }]`),
  plus `ChartEngine.getSelectedDataIndices()` and the `SelectChangedParams`
  type. A selection is dropped when `setOption()` brings a different set of
  series; a data-only refresh keeps it.
- Fixed while wiring this up: a bar data item's `itemStyle.color` is now
  resolved through the pass's theme-aware resolver (so a family name or a
  `var(--…)` reference works, not only a literal hex) and is honoured on
  stacked bars, which dropped it.

**Honesty**
- Series keys that ask for a visible behavior and are not rendered —
  `labelLine`, `labelLayout`, `clip`, `endLabel`, `showBackground`,
  `backgroundStyle`, `realtimeSort`, `avoidLabelOverlap`, `dimensions`,
  `seriesLayoutBy` — warn once, like `brush` and the unsupported tooltip keys
  already did.
- Every option key with no reader in `src/` now carries a
  `@deprecated Not implemented by @domphy/chart` JSDoc marker in the published
  types, so an editor strikes it through at the call site. The list is
  measured, not curated: `scripts/inert-keys.mjs` greps `src/` for a read of
  each key, `scripts/mark-inert-keys.mjs` re-derives the markers, and
  `tests/inert-keys-honest.test.ts` fails when a marker and the source grep
  disagree in either direction. Measured 2026-09: 435 of 1549 key declarations
  (204 of 443 distinct names). The per-component table in
  `docs/chart/vs-echarts.md` is generated from the same sweep
  (`node scripts/inert-keys.mjs --markdown`).

**Axes & scales**
- Time axes read `Date` objects and date strings from series data, so an auto-ranged time chart no longer collapses to the epoch fallback and maps its points off-canvas. `min`/`max` accept `"dataMin"`/`"dataMax"` and date values instead of coercing them to `NaN`.
- `axis.inverse` and `axis.splitNumber` are honoured.
- A value axis carrying bar-like series always spans the zero baseline the bars are drawn from; an explicit `min`/`max` still wins.
- A candlestick's axis extent covers the whole `[open, close, lowest, highest]` tuple — wicks used to hang outside the plot rect.
- Scalar data (`[10, 20, 30]`) on a `type: "value"` axis is positioned by item index, matching what the renderers draw; horizontal (category-y) charts read the scalar as the x value.
- `axis.boundaryGap: false` puts category 0 on the axis line and still leaves a band of `width / (categories - 1)` for band-sized series, matching ECharts' `getBandWidth()`; it used to collapse the band to zero and make bars, candlesticks, boxplots and heatmap cells vanish.
- Axis labels are thinned on any crowded axis — both directions, not only ordinal x axes (a narrow time axis used to overprint its labels; a short chart overprinted its y labels).
- A log axis labels each tick with its value (`1`, `2`, `10` …) as ECharts does. It used to print `base^round(log(value))`, which mislabelled every intermediate 2/3/5 tick — a chart could show `10^1, 10^1, 10^0, 10^0, 10^0`.
- A container smaller than the axis margins yields a collapsed, never a negative, grid rect.

**Series rendering**
- Values a log scale cannot place (`<= 0`) and `NaN` data no longer reach the vertex buffers in the line, bar and scatter renderers.
- A pie sums only positive, finite values: a `NaN` datum no longer collapses the total (one slice sweeping hundreds of radians) and a negative one no longer shortens the circle. Zero-width slices are not drawn, and a single-datum pie renders a full circle instead of a hairline.
- A single `NaN` no longer erases an entire radar series, and `radar.indicator[].max` is derived from the data when omitted.
- A `NaN` heatmap cell is left blank instead of being painted, and no longer poisons the value range that colours every other cell.
- `visualMap.min`/`max` and `inRange.color` drive heatmap cell colour: the cells used to auto-range over their own data with a built-in gradient while the visualMap legend drew a different ramp from the option's range, so the two disagreed. Values outside the range are not drawn unless `outOfRange.color` is given (ECharts' default out-of-range colour is `rgba(0,0,0,0)`).
- Palette colours are pinned to each series' index in `option.series`, so toggling a legend item no longer repaints the remaining series in another series' colour.

**Interaction**
- Tooltips, the axis pointer and the dataZoom slider are wired on pointer events: touch and pen work, and a slider drag that leaves the chart keeps tracking (the move/up listeners sit on `document`).
- The grid reserves the band a slider dataZoom occupies, so the slider no longer covers the x axis labels.
- `chart(option, { click })` and `ChartEngine.on("click")` / `.off("click")` report the data item under the cursor (ECharts semantics: nothing fires on empty space). Works with `tooltip.show: false`.
- The tooltip and legend swatches show the series' own `color` when it is set, instead of always the palette entry.

**Accessibility**
- The overlay SVG is `role="img"` with an `aria-label` from the title, or from the series types and names actually rendered.
- Legend items are WAI-ARIA APG toggle buttons: focusable, `aria-pressed`, <kbd>Enter</kbd>/<kbd>Space</kbd> activation, a visible focus ring, and focus that survives the re-render a toggle triggers. `legend.selectedMode: false` drops them from the tab order.
- A horizontal legend wraps instead of running items off the canvas.

**Robustness**
- WebGL context loss is handled: the engine prevents the default (which would make the loss permanent), drops the dead GPU resources and rebuilds on restore with a fresh canvas.

## 0.3.3

- `tooltip.appendToBody` is implemented — removed from the unsupported-tooltip-key warn list.

## 0.3.2

- `option.polar` no longer precomputes unused layout coords; `setOption` warns that polar has no effect. `resolvePolar` stays exported for tests and future wiring.

## 0.3.1

- Engine/dataset/grid/tooltip audit-fix pass: mixed-sign stacking, legend single-mode, pie hit-test, overlay groups keep every title/legend entry.

## 0.3.0

- `option.title` / `option.legend` arrays keep every entry: each overlay group is stamped `data-index` so a later item no longer removes the previous `.dc-title` / `.dc-legend`.
- `chart()` host uses `overflow: visible` so the tooltip is not clipped; `tooltip.appendToBody` mounts the tooltip on `document.body` with `position: fixed`.

## 0.2.3

- Chart engine + Domphy `chart()` patch; theme-aware series colors.
- Visual catalog clip-path freeze workaround for motion-hidden plots.
- Honest unsupported surface: `custom` series, `toolbox`, and `brush` log a console warning (typed for ECharts interop, not rendered).

## 0.2.0

- Initial public canvas chart package (ECharts-compatible type surface).
