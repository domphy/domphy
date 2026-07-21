// Main patch

// Grid coord utilities
export type { ZoomWindow } from "./coord/grid.js";
// Dataset transforms
export { applyTransforms, resolveDataset } from "./dataset/transform.js";
// Engine (for advanced embedding without the Domphy patch)
export { ChartEngine } from "./engine.js";
export type { Rgba } from "./gl/color.js";
// Color utilities
export {
  familyHex,
  familyRgba,
  hexToRgba,
  seriesHex,
  seriesPaletteFamily,
  seriesRgba,
} from "./gl/color.js";
// Map registry
export { getRegisteredMap, registerMap } from "./overlay/geomap.js";
// VisualMap color utility (map a value to a color from a VisualMap option)
export { colorFromVisualMap } from "./overlay/visualmap.js";
export { chart } from "./patch.js";
// Scales (public for custom series / advanced use)
export type {
  AnyScale,
  LinearScale,
  LogScale,
  OrdinalScale,
  TimeScale,
} from "./scale/index.js";
export {
  createLinearScale,
  createLogScale,
  createOrdinalScale,
  createTimeScale,
} from "./scale/index.js";
// Types — full ECharts-grade surface
// New series types
export type {
  AngleAxisOption,
  AreaStyleOption,
  Axis3DOption,
  AxisLabelOption,
  AxisLineOption,
  // Axis
  AxisOption,
  AxisPointerOption,
  AxisTickOption,
  AxisType,
  Bar3DSeriesOption,
  BarSeriesOption,
  BoxplotSeriesOption,
  BrushOption,
  CalendarOption,
  CandlestickSeriesOption,
  ChartOption,
  ChartRect,
  // Gradient
  ColorStop,
  CustomSeriesOption,
  // Dataset
  DatasetOption,
  DataZoomInsideOption,
  DataZoomOption,
  DataZoomSliderOption,
  EffectScatterSeriesOption,
  EmphasisOption,
  EncodeOption,
  // Funnel
  FunnelDataItem,
  FunnelSeriesOption,
  // Gauge
  GaugeDataItem,
  GaugeSeriesOption,
  GeoOption,
  GeoRegion,
  GradientObject,
  GraphCategory,
  GraphLink,
  // Graph
  GraphNode,
  GraphSeriesOption,
  Grid3DOption,
  // Components
  GridOption,
  HeatmapSeriesOption,
  ItemStyleOption,
  LabelLineOption,
  // Style
  LabelOption,
  LabelParams,
  LegendOption,
  Line3DSeriesOption,
  LinearGradient,
  LineSeriesOption,
  LineStyleOption,
  LinesDataItem,
  LinesSeriesOption,
  MapDataItem,
  MapSeriesOption,
  MarkAreaCorner,
  MarkAreaOption,
  MarkLineEndpoint,
  MarkLineOption,
  MarkPointDataItem,
  // Marks
  MarkPointOption,
  OrientType,
  ParallelAxisOption,
  ParallelOption,
  ParallelSeriesOption,
  PictorialBarSeriesOption,
  // Pie
  PieDataItem,
  PieSeriesOption,
  PolarOption,
  Position,
  RadarIndicator,
  // Radar
  RadarOption,
  RadarSeriesOption,
  RadialGradient,
  RadiusAxisOption,
  SankeyLink,
  // Sankey
  SankeyNode,
  SankeySeriesOption,
  Scatter3DSeriesOption,
  ScatterSeriesOption,
  SeriesOption,
  SplitAreaOption,
  SplitLineOption,
  Surface3DSeriesOption,
  // Misc
  SymbolType,
  ThemeFamily,
  ThemeRiverSeriesOption,
  TitleOption,
  ToolboxOption,
  TooltipOption,
  // Tooltip
  TooltipParams,
  TransformOption,
  // Treemap
  TreemapDataItem,
  TreemapLevelOption,
  TreemapSeriesOption,
  VisualMapContinuousOption,
  VisualMapOption,
  VisualMapPiecewiseOption,
} from "./types.js";
