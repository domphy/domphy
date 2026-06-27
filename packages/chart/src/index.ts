// Main patch
export { chart } from "./patch.js";

// Types — full ECharts-grade surface
export type {
  ChartOption,
  SeriesOption,
  LineSeriesOption,
  BarSeriesOption,
  PieSeriesOption,
  ScatterSeriesOption,
  RadarSeriesOption,
  HeatmapSeriesOption,
  CandlestickSeriesOption,
  BoxplotSeriesOption,
  GaugeSeriesOption,
  TreemapSeriesOption,
  FunnelSeriesOption,
  SankeySeriesOption,
  GraphSeriesOption,
  CustomSeriesOption,
  // Axis
  AxisOption,
  RadiusAxisOption,
  AngleAxisOption,
  AxisType,
  AxisLabelOption,
  AxisLineOption,
  AxisTickOption,
  SplitLineOption,
  SplitAreaOption,
  AxisPointerOption,
  // Components
  GridOption,
  PolarOption,
  TitleOption,
  LegendOption,
  TooltipOption,
  ToolboxOption,
  DataZoomOption,
  DataZoomSliderOption,
  DataZoomInsideOption,
  VisualMapOption,
  VisualMapContinuousOption,
  VisualMapPiecewiseOption,
  BrushOption,
  // Radar
  RadarOption,
  RadarIndicator,
  // Dataset
  DatasetOption,
  TransformOption,
  EncodeOption,
  // Marks
  MarkPointOption,
  MarkPointDataItem,
  MarkLineOption,
  MarkLineEndpoint,
  MarkAreaOption,
  MarkAreaCorner,
  // Style
  LabelOption,
  LabelParams,
  LabelLineOption,
  LineStyleOption,
  ItemStyleOption,
  AreaStyleOption,
  EmphasisOption,
  // Graph
  GraphNode,
  GraphLink,
  GraphCategory,
  // Sankey
  SankeyNode,
  SankeyLink,
  // Treemap
  TreemapDataItem,
  TreemapLevelOption,
  // Funnel
  FunnelDataItem,
  // Gauge
  GaugeDataItem,
  // Pie
  PieDataItem,
  // Tooltip
  TooltipParams,
  // Misc
  SymbolType,
  OrientType,
  Position,
  ThemeFamily,
  ChartRect,
} from "./types.js";

// Scales (public for custom series / advanced use)
export type { LinearScale, OrdinalScale, TimeScale, LogScale, AnyScale } from "./scale/index.js";
export { createLinearScale, createOrdinalScale, createTimeScale, createLogScale } from "./scale/index.js";

// Dataset transforms
export { applyTransforms, resolveDataset } from "./dataset/transform.js";

// Color utilities
export { hexToRgba, seriesHex, seriesRgba, familyHex, familyRgba, seriesPaletteFamily } from "./gl/color.js";
export type { Rgba } from "./gl/color.js";

// VisualMap color utility (map a value to a color from a VisualMap option)
export { colorFromVisualMap } from "./overlay/visualmap.js";

// Grid coord utilities
export type { ZoomWindow } from "./coord/grid.js";

// Engine (for advanced embedding without the Domphy patch)
export { ChartEngine } from "./engine.js";
