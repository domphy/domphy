# `@domphy/chart` — Spec

> ECharts-grade chart library, native Domphy. Geometry via `shapemetry`, color quality via `chromametry` (CIELAB). Tone/density cascade — same chart, any context.

---

## Design Principles

### 1. Color cascade (key differentiator vs ECharts)

ECharts: hardcoded `color: ['#5470c6', '#91cc75']` — breaks in dark context, no contrast guarantee.

`@domphy/chart`: series color = theme family name → resolved via `themeColor()` at render time.

```ts
lineSeries({ data, color: "primary" })   // adapts to dataTone of parent
barSeries({ data, color: "secondary" })  // WCAG contrast guaranteed (chromametry-backed)
```

Set `dataTone="shift-11"` on parent panel → chart colors automatically invert. Zero manual config.

Auto color assignment when `color` omitted: cycles through `["primary","secondary","success","warning","error","info","highlight"]` — all chromametry-quality ramps.

### 2. Spacing cascade

Tick density, label padding, legend gap → all use `themeSpacing(themeDensity(l) * n)`.  
Set `dataDensity="decrease-1"` on parent → chart compacts. No per-chart prop needed.

### 3. SVG element tree (not canvas)

Output = Domphy SVG element tree → inspectable, serializable, shadow-DOM-compatible.  
No canvas. No external rendering engine.

### 4. Geometry via shapemetry

- Smooth lines → `Spline2d` (cubic B-spline, NURBS-backed)
- Arc sectors (pie/gauge) → `Ellipse2d` + `CubicBezier2d` arc approximation
- Bezier transitions → `CubicBezier2d`
- Coordinate transform → `Transformation2d`
- Hit testing → `BoundingBox2d`

---

## Package Structure

```
packages/chart/src/
├── scale/
│   ├── LinearScale.ts      — linear numeric scale
│   ├── LogScale.ts         — logarithmic scale
│   ├── TimeScale.ts        — date/time scale
│   └── OrdinalScale.ts     — categorical scale
├── coord/
│   ├── Cartesian.ts        — grid coordinate system
│   ├── Polar.ts            — polar coordinate system (pie/radar/gauge)
│   └── Geo.ts              — (v2) geographic
├── axis/
│   ├── Axis.ts             — tick generation, label format, grid lines
│   └── RadiusAxis.ts       — polar radius axis
├── series/
│   ├── line/               — Line + Area
│   ├── bar/                — Bar (vertical, horizontal, stacked)
│   ├── pie/                — Pie + Donut
│   ├── scatter/            — Scatter + Bubble
│   ├── radar/              — Radar (spider)
│   ├── heatmap/            — Heatmap (cartesian + calendar)
│   ├── candlestick/        — OHLC Candlestick
│   ├── boxplot/            — Box plot
│   ├── gauge/              — Gauge (arc)
│   ├── treemap/            — Treemap
│   ├── funnel/             — Funnel
│   ├── sankey/             — Sankey diagram
│   ├── graph/              — Network graph (force/circular)
│   └── custom/             — Custom render function
├── component/
│   ├── Title.ts
│   ├── Legend.ts           — horizontal/vertical/scroll
│   ├── Tooltip.ts          — reactive tooltip overlay (Domphy element)
│   ├── Toolbox.ts          — save/zoom/reset actions
│   ├── DataZoom.ts         — slider + inside (wheel) zoom
│   ├── VisualMap.ts        — continuous + piecewise color mapping
│   └── Brush.ts            — rectangle/polygon selection
├── color/
│   └── seriesColor.ts      — auto-assign series colors from theme families
├── animation/
│   └── animate.ts          — enter/update/exit transitions (Web Animations API)
├── patch.ts                — chart() patch for Domphy
└── index.ts
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
  smooth?: boolean | number        // true = cubic spline via Spline2d; 0–1 = tension
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

## Color System (Domphy-native, chromametry-quality)

```ts
type ThemeFamily =
  | "primary" | "secondary" | "neutral"
  | "info" | "success" | "warning" | "attention"
  | "error" | "danger" | "highlight"

// Auto-cycle order when color omitted:
const AUTO_SERIES_COLOR: ThemeFamily[] = [
  "primary", "secondary", "success", "warning",
  "error", "info", "highlight", "attention"
]

// Resolved at render time via themeColor(listener, "base", family)
// → follows dataTone cascade of parent
// → chromametry-quality ramp (CIELAB perceptually uniform)
// → WCAG 4.5:1 guaranteed at base tone
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
  global?: boolean  // interpret coords in global SVG space instead of element bbox
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
  → Coordinate system (Cartesian / Polar)
    → Cartesian: xAxis + yAxis → pixel transform via Transformation2d
    → Polar: center + radius → angle/radius → Point2d
  → Series render
    → line: data points → Spline2d (smooth) or polyline → SVG <path>
    → bar: rects → SVG <rect>
    → pie: sectors → Ellipse2d arc → SVG <path>
    → scatter: points → SVG <circle>/<path symbol>
    → gauge: arc → CubicBezier2d arc approx → SVG <path>
  → Components render
    → Axis: ticks + labels → SVG <line> + Domphy <text>
    → Legend: Domphy element overlay
    → Tooltip: Domphy element (reactive, positioned via floating-ui)
    → DataZoom: Domphy element (reactive slider)
  → Animation (Web Animations API via motion() patch)
    → enter: path morphing / height grow / opacity
    → update: smooth tween via requestAnimationFrame
    → exit: opacity out
```

---

## Dependency Graph

```
@domphy/chart
  @domphy/core        (element tree, reactivity)
  @domphy/theme       (themeColor, themeSpacing, dataTone cascade)
  @domphy/floating    (tooltip positioning)
  @domphy/ui          (motion patch for animation)
  shapemetry          (Spline2d, CubicBezier2d, Ellipse2d, Point2d, BoundingBox2d)
  — NO canvas library
  — NO ECharts
  — NO D3
```

---

## MVP Scope (Phase 1)

Series: `line`, `bar`, `pie`, `scatter`, `radar`  
Components: `legend`, `tooltip`, `title`, `grid`  
Axes: `value`, `category`, `time`  
Color: full cascade system  
Animation: enter/update for all 5 series  

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
