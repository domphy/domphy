# `@domphy/chart` — Spec

> ECharts-grade chart library for Domphy. **WebGL series (luma.gl) + SVG overlays**, theme-family colors via `@domphy/theme`. ECharts-compatible option surface.

> **Note:** This SPEC tracks the shipped implementation; historical pure-SVG design notes (and claims of `shapemetry` / `chromametry` as chart engines) are retired.

---

## Design Principles

### 1. Two-layer rendering architecture

| Layer | Tech | Responsibility |
| --- | --- | --- |
| Series geometry (performance) | **WebGL** via `@luma.gl` v9 | `line`, `bar`, `scatter`, `pie`, `radar`, `heatmap`, `candlestick` (+ canvas host) |
| Overlay / layout | **SVG** (imperative DOM under the engine) | axes, grid lines, title, legend, tooltip, marks, labels; layout series: `funnel`, `treemap`, `sankey`, `graph`, `boxplot`, `parallel`, `themeRiver`, `geo`/`map`/`lines`, … |
| Gauge | SVG path drawing (`GaugeRenderer.renderToSvg`) | progress arc, ticks, detail text |

Not pure SVG. Not a Domphy element-tree of chart marks. Not canvas2d-only. The host is a `div` with background SVG + WebGL canvas + foreground SVG stacked absolutely.

### 2. Theme-family colors (`@domphy/theme`)

Series and overlay colors take **theme family names** (`"primary"`, `"secondary"`, …) and resolve through `themeColorToken(null, tone, family)` → concrete hex (light-theme default when no listener). Palette helpers live in `gl/color.ts` (`seriesHex`, `seriesPaletteFamily`, `familyHex`, …).

```ts
// series option
{ type: "line", data: [1, 2, 3], color: "primary" }
// auto when color omitted: cycles primary → secondary → success → warning → error → info → highlight → attention → danger
```

Theme ramps themselves are design-system quality (WCAG-oriented steps in `@domphy/theme` / palette). Chart does **not** depend on standalone `shapemetry` or `chromametry` packages.

### 3. ECharts-compatible option surface

`ChartOption` / series option types mirror ECharts-shaped configs (`xAxis`/`yAxis`/`grid`/`series`/`tooltip`/`legend`/`dataZoom`/`visualMap`/…) so existing mental models and many option snippets port with little translation. Domphy integration is the `chart(option | State<option>)` patch on a sized `div`.

### 4. Headless engine

`ChartEngine` owns device/canvas/SVG lifecycle for advanced embedding without the Domphy patch: `init()` → `setSize` → `setOption` → `destroy()`.

---

## Package Structure

```
packages/chart/src/
├── patch.ts                 — chart() Domphy patch
├── engine.ts                — ChartEngine (render pipeline)
├── types.ts                 — ChartOption + series/component types
├── index.ts                 — public exports
├── gl/                      — WebGL series renderers (luma.gl)
│   ├── device.ts            — getDevice / releaseDevice
│   ├── color.ts             — theme-family → hex / rgba
│   ├── BarRenderer.ts
│   ├── LineRenderer.ts
│   ├── ScatterRenderer.ts
│   ├── PieRenderer.ts
│   ├── RadarRenderer.ts
│   ├── HeatmapRenderer.ts
│   ├── CandlestickRenderer.ts
│   ├── GaugeRenderer.ts     — SVG gauge (constructor takes device for API symmetry)
│   ├── Renderer3D.ts        — 3D grid/series overlay helpers
│   └── shaders/             — GLSL sources (bar/line/pie/scatter/heatmap/common)
├── overlay/                 — SVG axes, chrome, layout series
│   ├── axes.ts, title.ts, legend.ts, tooltip.ts, labels.ts
│   ├── datazoom.ts, visualmap.ts
│   ├── boxplot.ts, funnel.ts, treemap.ts, sankey.ts, graph.ts
│   ├── calendar.ts, parallel.ts, themeriver.ts
│   ├── geomap.ts, lines.ts, effectscatter.ts, pictorialbar.ts
├── coord/
│   ├── grid.ts              — cartesian grid + zoom windows
│   └── polar.ts
├── scale/
│   ├── index.ts, linear.ts, log.ts, ordinal.ts, time.ts
├── dataset/
│   └── transform.ts
└── marks/
    └── index.ts             — markPoint / markLine / markArea → SVG
```

---

## API — Option Interface (ECharts-compatible surface)

```ts
interface ChartOption {
  // Layout
  title?:      TitleOption | TitleOption[]
  legend?:     LegendOption | LegendOption[]
  grid?:       GridOption | GridOption[]
  toolbox?:    ToolboxOption

  // Cartesian axes
  xAxis?:      AxisOption | AxisOption[]
  yAxis?:      AxisOption | AxisOption[]

  // Polar axes
  polar?:      PolarOption | PolarOption[]
  radiusAxis?: RadiusAxisOption | RadiusAxisOption[]
  angleAxis?:  AngleAxisOption | AngleAxisOption[]

  // Data
  dataset?:    DatasetOption | DatasetOption[]
  series:      SeriesOption[]

  // Interactivity
  tooltip?:    TooltipOption
  dataZoom?:   DataZoomOption | DataZoomOption[]
  visualMap?:  VisualMapOption | VisualMapOption[]
  brush?:      BrushOption

  // Animation
  animation?:  boolean
  animationDuration?: number
  animationEasing?:   string

  // Domphy-specific (NOT in ECharts)
  // color omitted — use series[].color: theme family name
  // spacing omitted — cascades from dataDensity
}
```

---

## Series Types

### Line

```ts
interface LineSeriesOption {
  type: "line"
  name?: string
  data: number[] | [number, number][] | DatasetRef
  
  // Appearance
  color?: ThemeFamily              // "primary" | "secondary" | ... — default auto
  lineWidth?: number               // default 2
  smooth?: boolean | number        // true = smooth curve in LineRenderer; 0–1 = tension
  step?: false | "start" | "middle" | "end"
  symbol?: SymbolType              // "circle" | "rect" | "diamond" | "triangle" | "none"
  symbolSize?: number | [number, number]
  
  // Area
  areaStyle?: {
    color?: ThemeFamily | GradientObject  // solid theme family or gradient (see Gradient section)
    opacity?: number               // default 0.2
    origin?: "auto" | "start" | "end" | number
  }
  
  // Stack
  stack?: string                   // stack group name
  
  // Axes
  xAxisIndex?: number
  yAxisIndex?: number
  
  // Marks
  markPoint?: MarkPointOption
  markLine?:  MarkLineOption
  markArea?:  MarkAreaOption
  
  // Encoding (dataset)
  encode?: EncodeOption
}
```

### Bar

```ts
interface BarSeriesOption {
  type: "bar"
  name?: string
  data: number[] | [number, number][] | DatasetRef
  
  color?: ThemeFamily
  barWidth?: number | string       // px or "%"
  barMaxWidth?: number | string
  barMinHeight?: number
  barGap?: string                  // gap between bars of different series, default "30%"
  barCategoryGap?: string          // gap between bar groups, default "20%"
  
  stack?: string
  stackStrategy?: "samesign" | "all" | "positive" | "negative"
  
  // Horizontal bar
  xAxisIndex?: number
  yAxisIndex?: number
  
  // Border radius (rounded bars)
  borderRadius?: number | [number, number, number, number]
  
  // Background bar
  showBackground?: boolean
  backgroundStyle?: { color?: ThemeFamily; opacity?: number }
  
  // Labels
  label?: LabelOption
  
  markPoint?: MarkPointOption
  markLine?:  MarkLineOption
  markArea?:  MarkAreaOption
  
  encode?: EncodeOption
}
```

### Pie

```ts
interface PieSeriesOption {
  type: "pie"
  name?: string
  data: PieDataItem[]
  
  // Geometry
  center?: [string | number, string | number]   // ["50%", "50%"]
  radius?: string | number | [string | number, string | number]  // "75%" or ["40%", "75%"] for donut
  
  // Angles
  startAngle?: number              // default 90
  clockwise?: boolean              // default true
  minAngle?: number                // min sector angle in degrees
  minShowLabelAngle?: number       // hide label below this angle
  
  // Rose chart
  roseType?: false | "radius" | "area"
  
  // Style
  color?: ThemeFamily[]            // per-slice override; default auto-cycle
  borderRadius?: number
  
  // Labels
  label?: PieLabelOption
  labelLine?: LabelLineOption
  
  // Interaction
  selectedMode?: boolean | "single" | "multiple"
  selectedOffset?: number
}

interface PieDataItem {
  name: string
  value: number
  color?: ThemeFamily
  selected?: boolean
}
```

### Scatter

```ts
interface ScatterSeriesOption {
  type: "scatter"
  name?: string
  data: [number, number][] | [number, number, number][] | DatasetRef
  
  color?: ThemeFamily
  symbol?: SymbolType
  symbolSize?: number | ((value: number[], params: any) => number)
  
  // Bubble (3rd value = size)
  sizeRange?: [number, number]     // map 3rd value to pixel size range
  
  xAxisIndex?: number
  yAxisIndex?: number
  
  label?: LabelOption
  encode?: EncodeOption
}
```

### Radar

```ts
interface RadarSeriesOption {
  type: "radar"
  name?: string
  data: RadarDataItem[]
  
  color?: ThemeFamily
  lineWidth?: number
  areaStyle?: { opacity?: number }
  symbol?: SymbolType
  symbolSize?: number
  
  radarIndex?: number
}

interface RadarDataItem {
  name?: string
  value: number[]
  color?: ThemeFamily
}
```

### Heatmap

```ts
interface HeatmapSeriesOption {
  type: "heatmap"
  name?: string
  data: [number, number, number][]  // [x, y, value]
  
  // Requires visualMap for color mapping
  xAxisIndex?: number
  yAxisIndex?: number
  
  // Calendar heatmap
  calendarIndex?: number
  
  pointSize?: number               // for geo heatmap
  blurSize?: number
  
  label?: LabelOption
  encode?: EncodeOption
}
```

### Candlestick

```ts
interface CandlestickSeriesOption {
  type: "candlestick"
  name?: string
  data: [number, number, number, number][]  // [open, close, low, high]
  
  // Colors
  upColor?: ThemeFamily            // default "success" (green)
  downColor?: ThemeFamily          // default "error" (red)
  upBorderColor?: ThemeFamily
  downBorderColor?: ThemeFamily
  
  barWidth?: number | string
  
  xAxisIndex?: number
  yAxisIndex?: number
  
  markPoint?: MarkPointOption
  markLine?:  MarkLineOption
}
```

### Boxplot

```ts
interface BoxplotSeriesOption {
  type: "boxplot"
  name?: string
  data: BoxplotDataItem[] | DatasetRef
  
  color?: ThemeFamily
  boxWidth?: [number | string, number | string]  // [min, max] width
  
  xAxisIndex?: number
  yAxisIndex?: number
  
  encode?: EncodeOption
}
```

### Gauge

```ts
interface GaugeSeriesOption {
  type: "gauge"
  name?: string
  data: GaugeDataItem[]
  
  // Geometry
  center?: [string | number, string | number]
  radius?: string | number
  startAngle?: number              // default 225 (7 o'clock)
  endAngle?: number                // default -45 (5 o'clock)
  clockwise?: boolean              // default true
  min?: number                     // default 0
  max?: number                     // default 100
  splitNumber?: number             // default 10
  
  // Arc
  color?: ThemeFamily
  progress?: {
    show?: boolean
    overlap?: boolean
    roundCap?: boolean
    width?: number
  }
  
  axisLine?: { lineStyle?: { width?: number; color?: [number, ThemeFamily][] } }
  splitLine?: { show?: boolean; length?: number }
  axisTick?: { show?: boolean; splitNumber?: number }
  axisLabel?: { show?: boolean; formatter?: string | ((value: number) => string) }
  
  pointer?: { show?: boolean; length?: string; width?: number }
  anchor?: { show?: boolean; size?: number }
  
  title?: { show?: boolean; offsetCenter?: [string, string] }
  detail?: { show?: boolean; formatter?: string | ((value: number) => string); offsetCenter?: [string, string] }
}

interface GaugeDataItem {
  name?: string
  value: number
  color?: ThemeFamily
}
```

### Treemap

```ts
interface TreemapSeriesOption {
  type: "treemap"
  name?: string
  data: TreemapDataItem[]
  
  // Layout
  width?: string | number
  height?: string | number
  left?: string | number
  top?: string | number
  
  // Visual
  color?: ThemeFamily[]
  colorMappingBy?: "value" | "index" | "id"
  
  // Interaction
  roam?: boolean | "scale" | "move"
  nodeClick?: false | "zoomToNode" | "link"
  drillDownIcon?: string
  
  leafDepth?: number
  levels?: TreemapLevelOption[]
  
  label?: LabelOption
  upperLabel?: LabelOption
  breadcrumb?: { show?: boolean }
}

interface TreemapDataItem {
  name: string
  value: number | number[]
  children?: TreemapDataItem[]
  color?: ThemeFamily
}
```

### Funnel

```ts
interface FunnelSeriesOption {
  type: "funnel"
  name?: string
  data: FunnelDataItem[]
  
  min?: number
  max?: number
  minSize?: string | number        // default "0%"
  maxSize?: string | number        // default "100%"
  
  sort?: "descending" | "ascending" | "none"
  gap?: number
  
  // Layout
  left?: string | number
  top?: string | number
  right?: string | number
  bottom?: string | number
  width?: string | number
  height?: string | number
  
  color?: ThemeFamily[]
  
  orient?: "vertical" | "horizontal"
  funnelAlign?: "left" | "right" | "center"
  
  label?: LabelOption
  labelLine?: LabelLineOption
}

interface FunnelDataItem {
  name: string
  value: number
  color?: ThemeFamily
}
```

### Sankey

```ts
interface SankeySeriesOption {
  type: "sankey"
  name?: string
  data: SankeyNode[]
  links: SankeyLink[]
  
  orient?: "horizontal" | "vertical"
  nodeWidth?: number
  nodeGap?: number
  nodeAlign?: "justify" | "left" | "right"
  
  color?: ThemeFamily[]
  
  label?: LabelOption
  lineStyle?: { opacity?: number; curveness?: number }
}

interface SankeyNode { name: string; value?: number; color?: ThemeFamily }
interface SankeyLink { source: string; target: string; value: number }
```

### Graph (Network)

```ts
interface GraphSeriesOption {
  type: "graph"
  name?: string
  data: GraphNode[]
  links: GraphLink[]
  categories?: GraphCategory[]
  
  layout?: "none" | "circular" | "force"
  
  // Force layout
  force?: {
    repulsion?: number
    gravity?: number
    edgeLength?: number | [number, number]
    friction?: number
  }
  
  roam?: boolean | "scale" | "move"
  
  symbol?: SymbolType
  symbolSize?: number
  
  color?: ThemeFamily[]
  
  label?: LabelOption
  edgeLabel?: LabelOption
  lineStyle?: { width?: number; opacity?: number; curveness?: number }
}
```

### Custom

```ts
interface CustomSeriesOption {
  type: "custom"
  name?: string
  data: any[]
  
  renderItem: (params: CustomRenderParams, api: CustomSeriesAPI) => CustomElement
  
  xAxisIndex?: number
  yAxisIndex?: number
  encode?: EncodeOption
}
```

---

## Axis Options

```ts
interface AxisOption {
  type?: "value" | "category" | "time" | "log"
  name?: string
  
  data?: (string | number | Date)[]   // for category axis
  
  // Range
  min?: number | "dataMin" | ((value: { min: number; max: number }) => number)
  max?: number | "dataMax" | ((value: { min: number; max: number }) => number)
  scale?: boolean                     // don't force 0 into range
  
  // Log
  logBase?: number                    // default 10
  
  // Ticks
  splitNumber?: number
  interval?: number
  minInterval?: number
  maxInterval?: number
  
  // Position
  position?: "top" | "bottom" | "left" | "right"
  offset?: number
  
  // Inverse
  inverse?: boolean
  
  // Labels
  axisLabel?: {
    show?: boolean
    interval?: number | "auto"
    rotate?: number
    formatter?: string | ((value: any, index: number) => string)
  }
  
  // Line / tick / split
  axisLine?: { show?: boolean; onZero?: boolean }
  axisTick?: { show?: boolean; alignWithLabel?: boolean; interval?: number | "auto" }
  splitLine?: { show?: boolean }
  splitArea?: { show?: boolean }
  
  // Multiple axes
  gridIndex?: number
}
```

---

## Components

### Legend

```ts
interface LegendOption {
  show?: boolean
  type?: "plain" | "scroll"
  orient?: "horizontal" | "vertical"
  
  left?: string | number
  top?: string | number
  right?: string | number
  bottom?: string | number
  
  padding?: number | [number, number] | [number, number, number, number]
  itemGap?: number
  itemWidth?: number
  itemHeight?: number
  
  formatter?: string | ((name: string) => string)
  
  selectedMode?: boolean | "single" | "multiple"
  selected?: Record<string, boolean>
  
  // scroll type
  pageButtonItemGap?: number
  pageIconSize?: number
}
```

### Tooltip

```ts
interface TooltipOption {
  show?: boolean
  trigger?: "item" | "axis" | "none"
  triggerOn?: "mousemove" | "click" | "mousemove|click" | "none"
  
  formatter?: string | ((params: TooltipParams | TooltipParams[]) => string | DomphyElement)
  
  position?: "top" | "bottom" | "left" | "right" | "inside" | [number, number] | ((point: [number, number], params: any, rect: any, size: any) => [number, number])
  
  axisPointer?: {
    type?: "line" | "shadow" | "cross" | "none"
    snap?: boolean
  }
  
  confine?: boolean
  appendToBody?: boolean
}
```

### DataZoom

```ts
interface DataZoomOption {
  type?: "slider" | "inside"
  
  xAxisIndex?: number | number[]
  yAxisIndex?: number | number[]
  
  start?: number                   // percentage 0–100
  end?: number
  startValue?: number | string | Date
  endValue?: number | string | Date
  
  minSpan?: number
  maxSpan?: number
  
  orient?: "horizontal" | "vertical"
  
  // slider only
  height?: number
  bottom?: number | string
  handleSize?: number | string
  
  // inside only
  zoomOnMouseWheel?: boolean | "shift" | "ctrl" | "alt"
  moveOnMouseMove?: boolean | "shift" | "ctrl" | "alt"
}
```

### VisualMap

```ts
interface VisualMapContinuousOption {
  type: "continuous"
  min: number
  max: number
  
  // Map to theme families (not hex colors)
  inRange?: { color?: ThemeFamily[] }
  outOfRange?: { color?: ThemeFamily }
  
  orient?: "horizontal" | "vertical"
  left?: string | number
  bottom?: string | number
  
  show?: boolean
  calculable?: boolean
  range?: [number, number]
}

interface VisualMapPiecewiseOption {
  type: "piecewise"
  pieces?: { min?: number; max?: number; value?: number; label?: string; color?: ThemeFamily }[]
  categories?: string[]
  
  selectedMode?: "multiple" | "single"
  show?: boolean
}
```

---

## Dataset

```ts
interface DatasetOption {
  source: any[][]                  // row-oriented data
  dimensions?: string[]            // column names
  sourceHeader?: boolean           // first row is header
  transform?: TransformOption[]
}

interface TransformOption {
  type: "filter" | "sort" | "aggregate" | string
  config: any
}
```

---

## Color System (theme families via `@domphy/theme`)

```ts
type ThemeFamily =
  | "primary" | "secondary" | "neutral"
  | "info" | "success" | "warning" | "attention"
  | "error" | "danger" | "highlight"

// Auto-cycle order when color omitted (see gl/color.ts):
const SERIES_PALETTE: ThemeFamily[] = [
  "primary", "secondary", "success", "warning",
  "error", "info", "highlight", "attention", "danger",
]

// Resolved via themeColorToken(null, "shift-9", family) → concrete hex
// (light-theme default; no live CSS-var listener for WebGL uniforms)
```

---

## Gradient fills

Area series support gradient fills via `AreaStyleOption.color`:

```ts
interface ColorStop {
  offset: number    // 0–1
  color: string     // any CSS color string
}

interface LinearGradient {
  type: "linear"
  x: number; y: number; x2: number; y2: number  // 0–1, bounding-box fractions
  colorStops: ColorStop[]
  global?: boolean  // interpret coords in global paint space instead of element bbox
}

interface RadialGradient {
  type: "radial"
  x: number; y: number; r: number  // center + radius, 0–1 fractions
  colorStops: ColorStop[]
  global?: boolean
}

type GradientObject = LinearGradient | RadialGradient

// Usage:
areaStyle: {
  color: {
    type: "linear", x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: "rgba(99,102,241,0.8)" },
      { offset: 1, color: "rgba(99,102,241,0.05)" },
    ],
  },
}
```

All four types are exported from `@domphy/chart`.

---

## Marks

```ts
interface MarkPointOption {
  data: MarkPointDataItem[]
  symbol?: SymbolType
  symbolSize?: number
  label?: LabelOption
}

interface MarkPointDataItem {
  type?: "max" | "min" | "average"
  name?: string
  coord?: [number, number]
  x?: number                       // pixel
  y?: number
  value?: number
}

interface MarkLineOption {
  data: [MarkLineEndpoint, MarkLineEndpoint][]
  label?: LabelOption
  lineStyle?: { type?: "solid" | "dashed" | "dotted" }
}

interface MarkLineEndpoint {
  type?: "max" | "min" | "average"
  coord?: [number, number]
  x?: number
  y?: number
}

interface MarkAreaOption {
  data: [[MarkAreaCorner, MarkAreaCorner]][]
  label?: LabelOption
}
```

---

## Patch API (Domphy integration)

```ts
import { chart } from "@domphy/chart"

// As patch on div/svg host
const element = {
  div: [],
  $: [
    chart({
      xAxis: { type: "category", data: ["Jan","Feb","Mar","Apr","May"] },
      yAxis: { type: "value" },
      series: [
        { type: "line", name: "Revenue", data: [120,200,150,80,220], smooth: true, color: "primary" },
        { type: "bar", name: "Cost", data: [80,120,90,60,140], color: "secondary" },
      ],
      tooltip: { trigger: "axis" },
      legend: {},
    })
  ],
  style: { width: "100%", height: "320px" },
  dataTone: "shift-2",      // chart colors cascade from here
  dataDensity: "decrease-1" // compact labels/ticks
}
```

---

## Render Pipeline

```
ChartOption
  → Dataset resolve (join series.data + dataset.source)
  → Scale computation (LinearScale / OrdinalScale / TimeScale / LogScale)
  → Grid / polar layout (coord/grid.ts, coord/polar.ts)
  → SVG chrome (behind + above canvas)
      axes grid lines (backsvg), axes labels, title, legend
      layout series (funnel/treemap/sankey/graph/…) → overlaysvg
      gauge → GaugeRenderer.renderToSvg
  → WebGL pass (luma.gl Device.beginRenderPass)
      Bar / Line / Scatter / Pie / Radar / Heatmap / Candlestick renderers
      device.submit()
  → SVG post-pass
      series symbols, labels, marks, dataZoom sliders
  → Tooltip (DOM overlay via @domphy/floating)
```

---

## Dependency Graph

```
@domphy/chart
  peer: @domphy/core      (chart() patch, reactivity State)
  peer: @domphy/theme     (themeColorToken for series/overlay colors)
  dep:  @domphy/floating  (tooltip positioning)
  dep:  @luma.gl/core | webgl | engine | shadertools  (WebGL series)
  — NO shapemetry
  — NO chromametry (theme ramps live in @domphy/theme / @domphy/palette)
  — NO ECharts runtime
  — NO D3
```

## Phase 2 (shipped)

Series: `heatmap`, `candlestick`, `boxplot`, `gauge`, `treemap`, `funnel`, `sankey`, `graph`  
Gradient area fills (`GradientObject` — linear + radial)  
Components: `dataZoom`, `visualMap`, `toolbox`, `brush`  
Axes: `log`  
Dataset + transforms  
Mark point/line/area  

## Phase 3 (shipped)

Series: `custom`, `parallel`, `themeRiver`, `map`, `scatter3D`, `bar3D`, `line3D`, `surface3D`  
Calendar coordinate system (`calendar` + `heatmap[coordinateSystem:"calendar"]`)  
Geo/map (`geo` + `map` series, GeoJSON via `registerMap`)  
3D charts (`grid3D`, `xAxis3D`, `yAxis3D`, `zAxis3D`) — SVG perspective projection, no extra package required  

### New series types (Phase 3)

#### Calendar / Heatmap

```ts
// Register a heatmap on a calendar coordinate system:
{
  calendar: { range: "2024" },
  series: [{
    type: "heatmap",
    coordinateSystem: "calendar",
    data: [["2024-01-15", 42], ["2024-03-22", 87]],
  }],
  visualMap: { min: 0, max: 100 },
}
```

#### Parallel Coordinates

```ts
{
  parallel: { left: "10%", right: "5%", top: "10%", bottom: "10%" },
  parallelAxis: [
    { dim: 0, name: "Income" },
    { dim: 1, name: "Education" },
    { dim: 2, name: "Age" },
  ],
  series: [{ type: "parallel", data: [[50000, 16, 35], [80000, 18, 42]] }],
}
```

#### ThemeRiver

```ts
{
  series: [{
    type: "themeRiver",
    data: [
      ["2024-01", 20, "Category A"],
      ["2024-02", 30, "Category A"],
      ["2024-01", 15, "Category B"],
    ],
  }],
}
```

#### Geo / Map

```ts
import { registerMap } from "@domphy/chart";
registerMap("world", worldGeoJSON);

{
  geo: { map: "world", roam: true },
  series: [{
    type: "map",
    map: "world",
    data: [{ name: "China", value: 1400 }, { name: "USA", value: 330 }],
  }],
  visualMap: { min: 0, max: 1400 },
}
```

#### 3D Charts

```ts
{
  grid3D: { viewControl: { alpha: 40, beta: 40 } },
  xAxis3D: { name: "X" },
  yAxis3D: { name: "Y" },
  zAxis3D: { name: "Z" },
  series: [{
    type: "scatter3D",
    data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
    symbolSize: 10,
    color: "primary",
  }],
}
```

#### surface3D

```ts
{
  grid3D: { viewControl: { alpha: 30, beta: 50, distance: 180 } },
  xAxis3D: { type: "value" },
  yAxis3D: { type: "value" },
  zAxis3D: { type: "value" },
  series: [{
    type: "surface3D",
    shapeW: 20,
    shapeH: 20,
    wireframe: { show: true },
    data: (() => {
      const pts = [];
      for (let i = 0; i < 20; i++)
        for (let j = 0; j < 20; j++) {
          const x = (i / 19) * 4 - 2;
          const y = (j / 19) * 4 - 2;
          pts.push([x, y, Math.sin(Math.sqrt(x*x + y*y))]);
        }
      return pts;
    })(),
  }],
}
```

Data must be a flat row-major grid of `[x, y, z]` points. `shapeW × shapeH` must equal `data.length`.
Z-value is mapped to a blue→green→red color gradient. No external 3D library required.
