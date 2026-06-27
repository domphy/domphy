import type { DomphyElement } from "@domphy/core";
import type { ThemeColor } from "@domphy/theme";

// ─── Theme family ────────────────────────────────────────────────────────────
export type ThemeFamily = ThemeColor;

// ─── Symbol types ────────────────────────────────────────────────────────────
export type SymbolType =
  | "circle"
  | "rect"
  | "roundRect"
  | "triangle"
  | "diamond"
  | "pin"
  | "arrow"
  | "none"
  | `image://${string}`;

// ─── Coordinate ──────────────────────────────────────────────────────────────
export type Position =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "inside"
  | "insideTop"
  | "insideBottom"
  | "insideLeft"
  | "insideRight"
  | "insideTopLeft"
  | "insideTopRight"
  | "insideBottomLeft"
  | "insideBottomRight";

export type OrientType = "horizontal" | "vertical";

// ─── Label ────────────────────────────────────────────────────────────────────
export interface LabelOption {
  show?: boolean;
  position?: Position | [number, number] | string;
  distance?: number;
  rotate?: number;
  offset?: [number, number];
  formatter?: string | ((params: LabelParams) => string);
  color?: ThemeFamily;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "bolder" | "lighter" | number;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  padding?: number | [number, number] | [number, number, number, number];
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  borderRadius?: number;
}

export interface LabelParams {
  name: string;
  value: any;
  percent?: number;
  dataIndex: number;
  seriesIndex: number;
  seriesName: string;
}

// ─── Line style ──────────────────────────────────────────────────────────────
export interface LineStyleOption {
  color?: ThemeFamily;
  width?: number;
  type?: "solid" | "dashed" | "dotted" | number[];
  dashOffset?: number;
  opacity?: number;
  curveness?: number;
}

// ─── Item style ──────────────────────────────────────────────────────────────
export interface ItemStyleOption {
  color?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  borderType?: "solid" | "dashed" | "dotted";
  borderRadius?: number | [number, number, number, number];
  opacity?: number;
}

// ─── Gradient (ECharts-compatible) ───────────────────────────────────────────
export interface ColorStop {
  offset: number;
  color: string;
}

export interface LinearGradient {
  type: "linear";
  x: number;
  y: number;
  x2: number;
  y2: number;
  colorStops: ColorStop[];
  global?: boolean;
}

export interface RadialGradient {
  type: "radial";
  x: number;
  y: number;
  r: number;
  colorStops: ColorStop[];
  global?: boolean;
}

export type GradientObject = LinearGradient | RadialGradient;

// ─── Area style ──────────────────────────────────────────────────────────────
export interface AreaStyleOption {
  color?: ThemeFamily | GradientObject;
  opacity?: number;
  origin?: "auto" | "start" | "end" | number;
}

// ─── Emphasis ─────────────────────────────────────────────────────────────────
export interface EmphasisOption {
  disabled?: boolean;
  scale?: boolean | number;
  focus?: "none" | "self" | "series" | "adjacency";
  blurScope?: "coordinateSystem" | "series" | "global";
  label?: LabelOption;
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  areaStyle?: AreaStyleOption;
}

// ─── Label line ──────────────────────────────────────────────────────────────
export interface LabelLineOption {
  show?: boolean;
  showAbove?: boolean;
  length?: number;
  length2?: number;
  smooth?: boolean | number;
  minTurnAngle?: number;
  lineStyle?: LineStyleOption;
}

// ─── Mark point ──────────────────────────────────────────────────────────────
export interface MarkPointOption {
  data?: MarkPointDataItem[];
  symbol?: SymbolType;
  symbolSize?: number | [number, number] | ((value: any, params: any) => number);
  silent?: boolean;
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  animation?: boolean;
  animationDuration?: number;
}

export interface MarkPointDataItem {
  type?: "max" | "min" | "average";
  name?: string;
  coord?: [number, number];
  x?: number;
  y?: number;
  value?: number;
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  itemStyle?: ItemStyleOption;
  label?: LabelOption;
}

// ─── Mark line ───────────────────────────────────────────────────────────────
export interface MarkLineOption {
  silent?: boolean;
  symbol?: SymbolType | [SymbolType, SymbolType];
  symbolSize?: number | [number, number];
  precision?: number;
  label?: LabelOption;
  lineStyle?: LineStyleOption;
  emphasis?: EmphasisOption;
  data?: [MarkLineEndpoint, MarkLineEndpoint][];
  animation?: boolean;
}

export interface MarkLineEndpoint {
  type?: "max" | "min" | "average" | "median";
  name?: string;
  coord?: [number, number];
  x?: number;
  y?: number;
  xAxis?: number | string;
  yAxis?: number | string;
  symbol?: SymbolType;
  label?: LabelOption;
}

// ─── Mark area ───────────────────────────────────────────────────────────────
export interface MarkAreaOption {
  silent?: boolean;
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  data?: [[MarkAreaCorner, MarkAreaCorner]];
  animation?: boolean;
}

export interface MarkAreaCorner {
  name?: string;
  type?: "max" | "min" | "average";
  coord?: [number, number];
  x?: number;
  y?: number;
  xAxis?: number | string;
  yAxis?: number | string;
}

// ─── Axis ─────────────────────────────────────────────────────────────────────
export type AxisType = "value" | "category" | "time" | "log";

export interface AxisLabelOption {
  show?: boolean;
  interval?: number | "auto" | ((index: number, value: string) => boolean);
  inside?: boolean;
  rotate?: number;
  margin?: number;
  formatter?: string | ((value: any, index: number) => string);
  color?: ThemeFamily;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "bolder" | "lighter" | number;
  align?: "left" | "center" | "right" | "auto";
  verticalAlign?: "top" | "middle" | "bottom";
  width?: number;
  overflow?: "truncate" | "break" | "breakAll" | "none";
  ellipsis?: string;
  hideOverlap?: boolean;
}

export interface AxisLineOption {
  show?: boolean;
  onZero?: boolean;
  onZeroAxisIndex?: number;
  symbol?: SymbolType | [SymbolType, SymbolType];
  symbolSize?: [number, number];
  lineStyle?: LineStyleOption;
}

export interface AxisTickOption {
  show?: boolean;
  alignWithLabel?: boolean;
  interval?: number | "auto";
  inside?: boolean;
  length?: number;
  lineStyle?: LineStyleOption;
}

export interface SplitLineOption {
  show?: boolean;
  interval?: number | "auto";
  lineStyle?: LineStyleOption;
}

export interface SplitAreaOption {
  show?: boolean;
  interval?: number | "auto";
  areaStyle?: { color?: ThemeFamily[]; opacity?: number };
}

export interface AxisPointerOption {
  show?: boolean | "auto";
  type?: "line" | "shadow" | "none" | "cross";
  snap?: boolean;
  label?: LabelOption;
  lineStyle?: LineStyleOption;
  shadowStyle?: ItemStyleOption;
  value?: number | string | Date;
  status?: "show" | "hide";
}

export interface AxisOption {
  id?: string;
  show?: boolean;
  gridIndex?: number;
  polarIndex?: number;
  position?: "top" | "bottom" | "left" | "right";
  offset?: number;
  type?: AxisType;
  name?: string;
  nameLocation?: "start" | "middle" | "center" | "end";
  nameTextStyle?: {
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    lineHeight?: number;
  };
  nameGap?: number;
  nameRotate?: number;
  inverse?: boolean;
  boundaryGap?: boolean | [string | number, string | number];
  min?: number | string | "dataMin" | ((value: { min: number; max: number }) => number);
  max?: number | string | "dataMax" | ((value: { min: number; max: number }) => number);
  scale?: boolean;
  splitNumber?: number;
  minInterval?: number;
  maxInterval?: number;
  interval?: number;
  logBase?: number;
  silent?: boolean;
  triggerEvent?: boolean;
  axisLine?: AxisLineOption;
  axisTick?: AxisTickOption;
  minorTick?: { show?: boolean; splitNumber?: number; length?: number; lineStyle?: LineStyleOption };
  axisLabel?: AxisLabelOption;
  splitLine?: SplitLineOption;
  minorSplitLine?: SplitLineOption;
  splitArea?: SplitAreaOption;
  data?: (string | number | Date | { value: string | number | Date; textStyle?: object })[];
  axisPointer?: AxisPointerOption;
  z?: number;
  zlevel?: number;
}

export interface RadiusAxisOption extends Omit<AxisOption, "position" | "gridIndex"> {
  polarIndex?: number;
}

export interface AngleAxisOption extends Omit<AxisOption, "position" | "gridIndex"> {
  polarIndex?: number;
  startAngle?: number;
  clockwise?: boolean;
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
export interface GridOption {
  id?: string;
  show?: boolean;
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
  containLabel?: boolean;
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  z?: number;
  zlevel?: number;
}

// ─── Polar ────────────────────────────────────────────────────────────────────
export interface PolarOption {
  id?: string;
  center?: [string | number, string | number];
  radius?: string | number | [string | number, string | number];
}

// ─── Title ────────────────────────────────────────────────────────────────────
export interface TitleOption {
  id?: string;
  show?: boolean;
  text?: string;
  link?: string;
  target?: "self" | "blank";
  textStyle?: {
    color?: ThemeFamily;
    fontStyle?: "normal" | "italic" | "oblique";
    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | number;
    fontSize?: number;
    lineHeight?: number;
    width?: number;
    overflow?: "truncate" | "break" | "breakAll" | "none";
    ellipsis?: string;
  };
  subtext?: string;
  sublink?: string;
  subtarget?: "self" | "blank";
  subtextStyle?: {
    color?: ThemeFamily;
    fontStyle?: "normal" | "italic" | "oblique";
    fontWeight?: "normal" | "bold";
    fontSize?: number;
    lineHeight?: number;
  };
  textAlign?: "auto" | "left" | "center" | "right";
  textVerticalAlign?: "auto" | "top" | "middle" | "bottom";
  triggerEvent?: boolean;
  padding?: number | [number, number] | [number, number, number, number];
  itemGap?: number;
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  borderRadius?: number | [number, number, number, number];
  z?: number;
  zlevel?: number;
}

// ─── Legend ───────────────────────────────────────────────────────────────────
export interface LegendOption {
  id?: string;
  show?: boolean;
  type?: "plain" | "scroll";
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
  orient?: OrientType;
  align?: "auto" | "left" | "right";
  padding?: number | [number, number] | [number, number, number, number];
  itemGap?: number;
  itemWidth?: number;
  itemHeight?: number;
  symbolKeepAspect?: boolean;
  formatter?: string | ((name: string) => string);
  selectedMode?: boolean | "single" | "multiple";
  inactiveColor?: ThemeFamily;
  inactiveBorderColor?: ThemeFamily;
  inactiveBorderWidth?: number | "auto";
  selected?: Record<string, boolean>;
  textStyle?: {
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    overflow?: "none" | "truncate" | "break" | "breakAll";
    width?: number;
  };
  tooltip?: TooltipOption;
  data?: (string | { name: string; icon?: SymbolType; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption })[];
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  borderRadius?: number | [number, number, number, number];
  pageButtonItemGap?: number;
  pageButtonGap?: number;
  pageButtonPosition?: "start" | "end";
  pageIconColor?: ThemeFamily;
  pageIconInactiveColor?: ThemeFamily;
  pageIconSize?: number | [number, number];
  pageTextStyle?: { color?: ThemeFamily; fontSize?: number };
  animation?: boolean;
  animationDurationUpdate?: number;
  z?: number;
  zlevel?: number;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
export interface TooltipOption {
  show?: boolean;
  trigger?: "item" | "axis" | "none";
  axisPointer?: {
    type?: "line" | "shadow" | "cross" | "none";
    axis?: "auto" | "x" | "y" | "radius" | "angle";
    snap?: boolean;
    z?: number;
    label?: LabelOption;
    lineStyle?: LineStyleOption;
    shadowStyle?: ItemStyleOption;
    crossStyle?: LineStyleOption;
    animation?: boolean;
  };
  showContent?: boolean;
  alwaysShowContent?: boolean;
  triggerOn?: "mousemove" | "click" | "mousemove|click" | "none";
  showDelay?: number;
  hideDelay?: number;
  enterable?: boolean;
  renderMode?: "html" | "richText";
  confine?: boolean;
  appendToBody?: boolean;
  className?: string;
  transitionDuration?: number;
  position?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "inside"
    | [number | string, number | string]
    | ((
        point: [number, number],
        params: TooltipParams | TooltipParams[],
        dom: HTMLElement,
        rect: { x: number; y: number; width: number; height: number } | null,
        size: { contentSize: [number, number]; viewSize: [number, number] },
      ) => [number | string, number | string] | { top?: string | number; left?: string | number; right?: string | number; bottom?: string | number });
  formatter?:
    | string
    | ((params: TooltipParams | TooltipParams[], ticket: string, callback: (ticket: string, html: string) => void) => string | DomphyElement);
  valueFormatter?: (value: any, dataIndex: number) => string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number | [number, number] | [number, number, number, number];
  textStyle?: {
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    lineHeight?: number;
  };
  extraCssText?: string;
  order?: "seriesAsc" | "seriesDesc" | "valueAsc" | "valueDesc";
}

export interface TooltipParams {
  componentType: string;
  seriesType: string;
  seriesIndex: number;
  seriesName: string;
  name: string;
  dataIndex: number;
  data: any;
  value: any;
  color: string;
  percent?: number;
  marker?: string;
  axisDim?: string;
  axisIndex?: number;
  axisType?: string;
  axisId?: string;
  axisValue?: string | number;
  axisValueLabel?: string;
}

// ─── Toolbox ──────────────────────────────────────────────────────────────────
export interface ToolboxOption {
  show?: boolean;
  orient?: OrientType;
  itemSize?: number;
  itemGap?: number;
  showTitle?: boolean;
  feature?: {
    saveAsImage?: { type?: "png" | "jpg" | "svg"; name?: string; title?: string; show?: boolean };
    restore?: { title?: string; show?: boolean };
    dataView?: { title?: string; show?: boolean; readOnly?: boolean; lang?: [string, string, string] };
    dataZoom?: { title?: { zoom?: string; back?: string }; show?: boolean; filterMode?: "filter" | "weakFilter" | "empty" | "none" };
    magicType?: {
      type?: ("line" | "bar" | "stack")[];
      title?: { line?: string; bar?: string; stack?: string; tiled?: string };
      show?: boolean;
    };
    brush?: { type?: ("rect" | "polygon" | "lineX" | "lineY" | "keep" | "clear")[]; title?: Record<string, string>; show?: boolean };
  };
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  z?: number;
  zlevel?: number;
}

// ─── DataZoom ─────────────────────────────────────────────────────────────────
export interface DataZoomSliderOption {
  type: "slider";
  id?: string;
  show?: boolean;
  xAxisIndex?: number | number[];
  yAxisIndex?: number | number[];
  radiusAxisIndex?: number | number[];
  angleAxisIndex?: number | number[];
  filterMode?: "filter" | "weakFilter" | "empty" | "none";
  start?: number;
  end?: number;
  startValue?: number | string | Date;
  endValue?: number | string | Date;
  minSpan?: number;
  maxSpan?: number;
  minValueSpan?: number;
  maxValueSpan?: number;
  orient?: OrientType;
  zoomLock?: boolean;
  throttle?: number;
  rangeMode?: ["value" | "percent", "value" | "percent"];
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
  borderColor?: ThemeFamily;
  borderRadius?: number;
  backgroundColor?: ThemeFamily;
  dataBackground?: { lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  selectedDataBackground?: { lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  fillerColor?: ThemeFamily;
  handleColor?: ThemeFamily;
  handleStyle?: ItemStyleOption;
  handleSize?: number | string;
  handleIcon?: SymbolType;
  moveHandleStyle?: ItemStyleOption;
  moveHandleSize?: number;
  labelPrecision?: number | "auto";
  labelFormatter?: string | ((value: number | string, valueStr: string) => string);
  showDetail?: boolean;
  showDataShadow?: "auto" | boolean;
  realtime?: boolean;
  textStyle?: { color?: ThemeFamily; fontSize?: number };
  brushSelect?: boolean;
  brushStyle?: ItemStyleOption;
  emphasis?: { handleStyle?: ItemStyleOption; moveHandleStyle?: ItemStyleOption };
  z?: number;
  zlevel?: number;
}

export interface DataZoomInsideOption {
  type: "inside";
  id?: string;
  disabled?: boolean;
  xAxisIndex?: number | number[];
  yAxisIndex?: number | number[];
  filterMode?: "filter" | "weakFilter" | "empty" | "none";
  start?: number;
  end?: number;
  startValue?: number | string | Date;
  endValue?: number | string | Date;
  minSpan?: number;
  maxSpan?: number;
  orient?: OrientType;
  zoomLock?: boolean;
  throttle?: number;
  rangeMode?: ["value" | "percent", "value" | "percent"];
  zoomOnMouseWheel?: boolean | "shift" | "ctrl" | "alt";
  moveOnMouseMove?: boolean | "shift" | "ctrl" | "alt";
  moveOnMouseWheel?: boolean | "shift" | "ctrl" | "alt";
  preventDefaultMouseMove?: boolean;
}

export type DataZoomOption = DataZoomSliderOption | DataZoomInsideOption;

// ─── VisualMap ────────────────────────────────────────────────────────────────
export interface VisualMapContinuousOption {
  type: "continuous";
  id?: string;
  min: number;
  max: number;
  range?: [number, number];
  calculable?: boolean;
  realtime?: boolean;
  inverse?: boolean;
  precision?: number;
  itemWidth?: number;
  itemHeight?: number;
  align?: "auto" | "left" | "right" | "top" | "bottom";
  text?: [string, string];
  textGap?: number;
  show?: boolean;
  dimension?: number;
  seriesIndex?: number | number[];
  hoverLink?: boolean;
  inRange?: { color?: ThemeFamily[]; opacity?: number; symbol?: SymbolType; symbolSize?: [number, number] };
  outOfRange?: { color?: ThemeFamily[]; opacity?: number };
  controller?: { inRange?: object; outOfRange?: object };
  orient?: OrientType;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  padding?: number | [number, number];
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  color?: ThemeFamily[];
  textStyle?: { color?: ThemeFamily; fontSize?: number };
  formatter?: string | ((value: number, value2: number) => string);
  handleIcon?: SymbolType;
  handleSize?: number | string;
  handleStyle?: ItemStyleOption;
  indicatorIcon?: SymbolType;
  indicatorSize?: number | string;
  indicatorStyle?: ItemStyleOption;
  z?: number;
  zlevel?: number;
}

export interface VisualMapPiecewiseOption {
  type: "piecewise";
  id?: string;
  splitNumber?: number;
  pieces?: {
    min?: number;
    max?: number;
    lt?: number;
    gt?: number;
    lte?: number;
    gte?: number;
    value?: number;
    label?: string;
    color?: ThemeFamily;
    opacity?: number;
  }[];
  categories?: string[];
  min?: number;
  max?: number;
  minOpen?: boolean;
  maxOpen?: boolean;
  selectedMode?: "multiple" | "single";
  inverse?: boolean;
  precision?: number;
  itemWidth?: number;
  itemHeight?: number;
  align?: "auto" | "left" | "right";
  text?: [string, string];
  textGap?: number;
  showLabel?: boolean;
  itemGap?: number;
  itemSymbol?: SymbolType;
  show?: boolean;
  dimension?: number;
  seriesIndex?: number | number[];
  hoverLink?: boolean;
  inRange?: { color?: ThemeFamily[]; opacity?: number; symbol?: SymbolType };
  outOfRange?: { color?: ThemeFamily[]; opacity?: number };
  controller?: { inRange?: object; outOfRange?: object };
  orient?: OrientType;
  left?: number | string;
  right?: number | string;
  top?: number | string;
  bottom?: number | string;
  padding?: number | [number, number];
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  color?: ThemeFamily[];
  textStyle?: { color?: ThemeFamily; fontSize?: number };
  formatter?: string | ((value: number | string, value2: number | string) => string);
  z?: number;
  zlevel?: number;
}

export type VisualMapOption = VisualMapContinuousOption | VisualMapPiecewiseOption;

// ─── Brush ────────────────────────────────────────────────────────────────────
export interface BrushOption {
  id?: string;
  toolbox?: ("rect" | "polygon" | "lineX" | "lineY" | "keep" | "clear")[];
  brushLink?: number[] | "all" | "none";
  seriesIndex?: number[] | "all" | "none";
  geoIndex?: number[] | "all" | "none";
  xAxisIndex?: number[] | "all" | "none";
  yAxisIndex?: number[] | "all" | "none";
  brushType?: "rect" | "polygon" | "lineX" | "lineY";
  brushMode?: "single" | "multiple";
  transformable?: boolean;
  brushStyle?: ItemStyleOption;
  throttleType?: "debounce" | "fixRate";
  throttleDelay?: number;
  removeOnClick?: boolean;
  inBrush?: { color?: ThemeFamily[]; opacity?: number; symbol?: SymbolType; symbolSize?: [number, number] };
  outOfBrush?: { color?: ThemeFamily[]; opacity?: number };
  z?: number;
}

// ─── Dataset ──────────────────────────────────────────────────────────────────
export interface DatasetOption {
  id?: string;
  source?: any[][] | Record<string, any[]> | Record<string, any>[];
  dimensions?: (string | { name: string; type?: "ordinal" | "number" | "float" | "int" | "time"; displayName?: string })[];
  sourceHeader?: boolean;
  transform?: TransformOption[];
  fromDatasetIndex?: number;
  fromDatasetId?: string;
  fromTransformResult?: number;
}

export interface TransformOption {
  type: "filter" | "sort" | string;
  config?: Record<string, any>;
  print?: boolean;
}

// ─── Encode ───────────────────────────────────────────────────────────────────
export interface EncodeOption {
  x?: string | number | (string | number)[];
  y?: string | number | (string | number)[];
  radius?: string | number;
  angle?: string | number;
  value?: string | number;
  seriesName?: string | number;
  itemId?: string | number;
  itemName?: string | number;
  itemGroupId?: string | number;
  tooltip?: string | number | (string | number)[];
}

// ─── Dataset ref (series can point to dataset) ───────────────────────────────
export interface DatasetRef {
  datasetIndex?: number;
  datasetId?: string;
}

// ─── Series ───────────────────────────────────────────────────────────────────

export interface LineSeriesOption {
  type: "line";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "polar";
  xAxisIndex?: number;
  yAxisIndex?: number;
  polarIndex?: number;
  symbol?: SymbolType;
  symbolSize?: number | [number, number] | ((value: any, params: any) => number);
  symbolRotate?: number;
  symbolKeepAspect?: boolean;
  symbolOffset?: [number | string, number | string];
  showSymbol?: boolean;
  showAllSymbol?: boolean | "auto";
  hoverAnimation?: boolean;
  legendHoverLink?: boolean;
  stack?: string;
  stackStrategy?: "samesign" | "all" | "positive" | "negative";
  cursor?: string;
  connectNulls?: boolean;
  clip?: boolean;
  step?: false | "start" | "middle" | "end";
  label?: LabelOption;
  endLabel?: LabelOption;
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  areaStyle?: AreaStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  smooth?: boolean | number;
  smoothMonotone?: "x" | "y" | "none";
  sampling?: "lttb" | "average" | "min" | "max" | "minmax" | "sum";
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: (number | null | undefined | [number | string | Date, number] | { value: number | null; name?: string; itemStyle?: ItemStyleOption; label?: LabelOption; emphasis?: EmphasisOption })[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationThreshold?: number;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface BarSeriesOption {
  type: "bar";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "polar";
  xAxisIndex?: number;
  yAxisIndex?: number;
  polarIndex?: number;
  legendHoverLink?: boolean;
  coordinateSystemIndex?: number;
  label?: LabelOption;
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  stack?: string;
  stackStrategy?: "samesign" | "all" | "positive" | "negative";
  cursor?: string;
  barWidth?: number | string;
  barMaxWidth?: number | string;
  barMinWidth?: number | string;
  barMinHeight?: number;
  barMinAngle?: number;
  barGap?: string;
  barCategoryGap?: string;
  large?: boolean;
  largeThreshold?: number;
  progressive?: number;
  progressiveThreshold?: number;
  progressiveChunkMode?: "mod" | "sequential";
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: (number | null | undefined | [number | string | Date, number] | { value: number | null; name?: string; itemStyle?: ItemStyleOption; label?: LabelOption; emphasis?: EmphasisOption })[];
  clip?: boolean;
  realtimeSort?: boolean;
  showBackground?: boolean;
  backgroundStyle?: ItemStyleOption & { borderRadius?: number | [number, number, number, number] };
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationThreshold?: number;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily;
  borderRadius?: number | [number, number, number, number];
}

export interface PieDataItem {
  name?: string;
  value: number;
  selected?: boolean;
  label?: LabelOption;
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  tooltip?: TooltipOption;
}

export interface PieSeriesOption {
  type: "pie";
  id?: string;
  name?: string;
  colorBy?: "series" | "data";
  legendHoverLink?: boolean;
  coordinateSystem?: never;
  selectedMode?: boolean | "single" | "multiple";
  selectedOffset?: number;
  clockwise?: boolean;
  startAngle?: number;
  minAngle?: number;
  minShowLabelAngle?: number;
  roseType?: false | "radius" | "area";
  avoidLabelOverlap?: boolean;
  stillShowZeroSum?: boolean;
  percentPrecision?: number;
  cursor?: string;
  center?: [string | number, string | number];
  radius?: string | number | [string | number, string | number];
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: PieDataItem[];
  label?: LabelOption & { position?: "outside" | "inside" | "inner" | "center" };
  labelLine?: LabelLineOption;
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationThreshold?: number;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
  borderRadius?: number | [number, number, number, number];
}

export interface ScatterSeriesOption {
  type: "scatter";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "polar" | "geo";
  xAxisIndex?: number;
  yAxisIndex?: number;
  polarIndex?: number;
  geoIndex?: number;
  legendHoverLink?: boolean;
  symbol?: SymbolType;
  symbolSize?: number | [number, number] | ((value: any, params: any) => number);
  symbolRotate?: number;
  symbolKeepAspect?: boolean;
  symbolOffset?: [number | string, number | string];
  large?: boolean;
  largeThreshold?: number;
  cursor?: string;
  label?: LabelOption;
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  progressive?: number;
  progressiveThreshold?: number;
  progressiveChunkMode?: "mod" | "sequential";
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: (number | null | undefined | number[] | { value: number | number[]; name?: string; itemStyle?: ItemStyleOption; label?: LabelOption; emphasis?: EmphasisOption; symbol?: SymbolType; symbolSize?: number })[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationThreshold?: number;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface RadarIndicator {
  name?: string;
  max: number;
  min?: number;
  color?: ThemeFamily;
}

export interface RadarOption {
  id?: string;
  zlevel?: number;
  z?: number;
  center?: [string | number, string | number];
  radius?: string | number | [string | number, string | number];
  startAngle?: number;
  axisName?: { show?: boolean; formatter?: string | ((name: string) => string); color?: ThemeFamily; fontSize?: number; fontWeight?: "normal" | "bold"; backgroundColor?: ThemeFamily; borderRadius?: number; padding?: number | [number, number] };
  nameGap?: number;
  splitNumber?: number;
  shape?: "polygon" | "circle";
  scale?: boolean;
  silent?: boolean;
  triggerEvent?: boolean;
  axisLine?: AxisLineOption;
  axisTick?: AxisTickOption;
  axisLabel?: AxisLabelOption;
  splitLine?: SplitLineOption;
  splitArea?: SplitAreaOption;
  indicator: RadarIndicator[];
}

export interface RadarSeriesOption {
  type: "radar";
  id?: string;
  name?: string;
  radarIndex?: number;
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  symbolRotate?: number;
  symbolKeepAspect?: boolean;
  legendHoverLink?: boolean;
  label?: LabelOption;
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  areaStyle?: AreaStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  data?: { name?: string; value: number[]; label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption; emphasis?: EmphasisOption; symbol?: SymbolType; symbolSize?: number }[];
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface HeatmapSeriesOption {
  type: "heatmap";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "geo" | "calendar";
  xAxisIndex?: number;
  yAxisIndex?: number;
  geoIndex?: number;
  calendarIndex?: number;
  blurSize?: number;
  pointSize?: number;
  maxOpacity?: number;
  minOpacity?: number;
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: [number, number, number][];
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  progressive?: number;
  progressiveThreshold?: number;
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
}

export interface CandlestickSeriesOption {
  type: "candlestick";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d";
  xAxisIndex?: number;
  yAxisIndex?: number;
  legendHoverLink?: boolean;
  layout?: "horizontal" | "vertical";
  barWidth?: number | string;
  barMaxWidth?: number | string;
  barMinWidth?: number | string;
  itemStyle?: {
    color?: ThemeFamily;
    color0?: ThemeFamily;
    borderColor?: ThemeFamily;
    borderColor0?: ThemeFamily;
    borderColorDoji?: ThemeFamily;
    borderWidth?: number;
    opacity?: number;
  };
  emphasis?: EmphasisOption;
  blur?: { itemStyle?: object };
  select?: { itemStyle?: object };
  selectedMode?: boolean | "single" | "multiple" | "series";
  large?: boolean;
  largeThreshold?: number;
  progressive?: number;
  progressiveThreshold?: number;
  progressiveChunkMode?: "mod" | "sequential";
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: [number, number, number, number][] | { value: [number, number, number, number]; itemStyle?: object }[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  clip?: boolean;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  upColor?: ThemeFamily;
  downColor?: ThemeFamily;
  upBorderColor?: ThemeFamily;
  downBorderColor?: ThemeFamily;
}

export interface BoxplotSeriesOption {
  type: "boxplot";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d";
  xAxisIndex?: number;
  yAxisIndex?: number;
  legendHoverLink?: boolean;
  layout?: "horizontal" | "vertical";
  boxWidth?: [number | string, number | string];
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { itemStyle?: ItemStyleOption };
  select?: { itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: [number, number, number, number, number][] | { value: [number, number, number, number, number]; name?: string; itemStyle?: ItemStyleOption }[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface GaugeDataItem {
  name?: string;
  value: number;
  detail?: { offsetCenter?: [string | number, string | number]; formatter?: string | ((value: number) => string) };
  pointer?: { show?: boolean };
  itemStyle?: ItemStyleOption;
  title?: { offsetCenter?: [string | number, string | number] };
}

export interface GaugeSeriesOption {
  type: "gauge";
  id?: string;
  name?: string;
  legendHoverLink?: boolean;
  center?: [string | number, string | number];
  radius?: string | number;
  clockwise?: boolean;
  startAngle?: number;
  endAngle?: number;
  min?: number;
  max?: number;
  splitNumber?: number;
  itemStyle?: ItemStyleOption;
  progress?: {
    show?: boolean;
    overlap?: boolean;
    width?: number;
    roundCap?: boolean;
    clip?: boolean;
    itemStyle?: ItemStyleOption;
  };
  axisLine?: {
    show?: boolean;
    roundCap?: boolean;
    lineStyle?: { width?: number; color?: [number, ThemeFamily][]; shadowBlur?: number; opacity?: number };
  };
  splitLine?: { show?: boolean; distance?: number; length?: number; lineStyle?: LineStyleOption };
  axisTick?: { show?: boolean; splitNumber?: number; distance?: number; length?: number; lineStyle?: LineStyleOption };
  axisLabel?: AxisLabelOption & { distance?: number; formatter?: string | ((value: number) => string) };
  pointer?: {
    show?: boolean;
    showAbove?: boolean;
    icon?: SymbolType;
    offsetCenter?: [string | number, string | number];
    length?: string | number;
    width?: number;
    keepAspect?: boolean;
    itemStyle?: ItemStyleOption;
  };
  anchor?: {
    show?: boolean;
    showAbove?: boolean;
    size?: number;
    icon?: SymbolType;
    offsetCenter?: [string | number, string | number];
    keepAspect?: boolean;
    itemStyle?: ItemStyleOption;
  };
  emphasis?: EmphasisOption;
  title?: {
    show?: boolean;
    offsetCenter?: [string | number, string | number];
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    lineHeight?: number;
    backgroundColor?: ThemeFamily;
    borderRadius?: number;
    padding?: number | [number, number];
    valueAnimation?: boolean;
  };
  detail?: {
    show?: boolean;
    offsetCenter?: [string | number, string | number];
    formatter?: string | ((value: number) => string);
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    lineHeight?: number;
    borderRadius?: number;
    padding?: number | [number, number];
    valueAnimation?: boolean;
    width?: number | string;
    height?: number | string;
    backgroundColor?: ThemeFamily;
  };
  data?: GaugeDataItem[];
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface TreemapLevelOption {
  visualDimension?: number;
  visualMin?: number;
  visualMax?: number;
  color?: ThemeFamily[];
  colorAlpha?: [number, number];
  colorSaturation?: number | [number, number];
  colorMappingBy?: "value" | "index" | "id";
  visibleMin?: number;
  childrenVisibleMin?: number;
  label?: LabelOption;
  upperLabel?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: object;
  select?: object;
}

export interface TreemapDataItem {
  id?: string;
  name?: string;
  value: number | number[];
  groupId?: string;
  childGroupId?: string;
  children?: TreemapDataItem[];
  label?: LabelOption;
  upperLabel?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: object;
  select?: object;
  link?: string;
  target?: "self" | "blank";
  color?: ThemeFamily;
}

export interface TreemapSeriesOption {
  type: "treemap";
  id?: string;
  name?: string;
  zlevel?: number;
  z?: number;
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  width?: string | number;
  height?: string | number;
  squareRatio?: number;
  leafDepth?: number;
  drillDownIcon?: string;
  roam?: boolean | "scale" | "move";
  nodeClick?: false | "zoomToNode" | "link";
  zoomToNodeRatio?: number;
  universalTransition?: boolean;
  visualDimension?: number;
  visualMin?: number;
  visualMax?: number;
  colorAlpha?: [number, number];
  colorSaturation?: number | [number, number];
  colorMappingBy?: "value" | "index" | "id";
  visibleMin?: number;
  childrenVisibleMin?: number;
  label?: LabelOption;
  upperLabel?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: object;
  select?: object;
  selectedMode?: boolean | "single" | "multiple";
  breadcrumb?: {
    show?: boolean;
    left?: string | number;
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    height?: number;
    emptyItemWidth?: number;
    itemStyle?: ItemStyleOption;
    emphasis?: EmphasisOption;
  };
  levels?: TreemapLevelOption[];
  data?: TreemapDataItem[];
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
}

export interface FunnelDataItem {
  name?: string;
  value: number;
  label?: LabelOption;
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  color?: ThemeFamily;
}

export interface FunnelSeriesOption {
  type: "funnel";
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  minSize?: string | number;
  maxSize?: string | number;
  orient?: OrientType;
  sort?: "descending" | "ascending" | "none" | ((a: FunnelDataItem, b: FunnelDataItem) => number);
  gap?: number;
  legendHoverLink?: boolean;
  funnelAlign?: "left" | "right" | "center";
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  width?: string | number;
  height?: string | number;
  label?: LabelOption & { position?: "left" | "right" | "inside" | "rightTop" | "rightBottom" | "leftTop" | "leftBottom" | "insideRight" | "insideLeft" };
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  data?: FunnelDataItem[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
}

export interface SankeyNode {
  id?: string;
  name: string;
  value?: number;
  depth?: number;
  itemStyle?: ItemStyleOption;
  label?: LabelOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  focusNodeAdjacency?: boolean;
  color?: ThemeFamily;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  lineStyle?: LineStyleOption;
  emphasis?: EmphasisOption;
  blur?: { lineStyle?: LineStyleOption };
  select?: { lineStyle?: LineStyleOption };
  focusNodeAdjacency?: boolean;
}

export interface SankeySeriesOption {
  type: "sankey";
  id?: string;
  name?: string;
  zlevel?: number;
  z?: number;
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  width?: string | number;
  height?: string | number;
  nodeWidth?: number;
  nodeGap?: number;
  nodeAlign?: "justify" | "left" | "right";
  orient?: OrientType;
  draggable?: boolean;
  layoutIterations?: number;
  selectedMode?: boolean | "single" | "multiple" | "series";
  levels?: object[];
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption & { curveness?: number };
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption };
  focusNodeAdjacency?: boolean | "allEdges" | "outEdges" | "inEdges";
  data?: SankeyNode[];
  nodes?: SankeyNode[];
  links?: SankeyLink[];
  edges?: SankeyLink[];
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
}

export interface GraphNode {
  id?: string;
  name?: string;
  x?: number;
  y?: number;
  value?: number | number[];
  category?: number;
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  draggable?: boolean;
  cursor?: string;
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  tooltip?: TooltipOption;
  color?: ThemeFamily;
}

export interface GraphLink {
  id?: string;
  source: string | number;
  target: string | number;
  value?: number;
  lineStyle?: LineStyleOption;
  label?: LabelOption;
  emphasis?: EmphasisOption;
  blur?: { lineStyle?: LineStyleOption; label?: LabelOption };
  select?: { lineStyle?: LineStyleOption; label?: LabelOption };
  symbol?: SymbolType | [SymbolType, SymbolType];
  symbolSize?: number | [number, number];
  ignoreForceLayout?: boolean;
}

export interface GraphCategory {
  name?: string;
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  color?: ThemeFamily;
}

export interface GraphSeriesOption {
  type: "graph";
  id?: string;
  name?: string;
  legendHoverLink?: boolean;
  coordinateSystem?: "none" | "cartesian2d" | "polar" | "geo";
  xAxisIndex?: number;
  yAxisIndex?: number;
  polarIndex?: number;
  geoIndex?: number;
  calendarIndex?: number;
  center?: [string | number, string | number];
  zoom?: number;
  layout?: "none" | "circular" | "force";
  circular?: { rotateLabel?: boolean };
  force?: {
    initLayout?: "circular" | "none";
    repulsion?: number | number[];
    gravity?: number;
    edgeLength?: number | [number, number];
    layoutAnimation?: boolean;
    friction?: number;
  };
  roam?: boolean | "scale" | "move";
  draggable?: boolean;
  edgeSymbol?: SymbolType | [SymbolType, SymbolType];
  edgeSymbolSize?: number | [number, number];
  cursor?: string;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  label?: LabelOption;
  edgeLabel?: LabelOption;
  labelLayout?: object;
  emphasis?: EmphasisOption;
  blur?: { itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; label?: LabelOption; edgeLabel?: LabelOption };
  select?: { itemStyle?: ItemStyleOption; lineStyle?: LineStyleOption; label?: LabelOption; edgeLabel?: LabelOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  categories?: GraphCategory[];
  autoCurveness?: boolean | number | number[];
  data?: GraphNode[];
  nodes?: GraphNode[];
  links?: GraphLink[];
  edges?: GraphLink[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
}

export interface CustomRenderParams {
  context: object;
  seriesId: string;
  seriesName: string;
  seriesIndex: number;
  coordSys: {
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    cx?: number;
    cy?: number;
    r?: number;
    r0?: number;
    startAngle?: number;
    endAngle?: number;
  };
  dataIndexInside: number;
  dataIndex: number;
  actionType?: string;
}

export interface CustomSeriesAPI {
  value(dim: number | string, dataIndexInside?: number): number;
  ordinalRawValue(dim: number | string, dataIndexInside?: number): string | number;
  coord(data: number[]): number[];
  size(dataSize: number[], dataItem?: number[]): number[];
  style(extra?: object, dataIndexInside?: number): object;
  styleEmphasis(extra?: object, dataIndexInside?: number): object;
  visual(visualType: string, dataIndexInside?: number): any;
  currentSeriesIndices(): number[];
  font(opt: object): string;
  getWidth(): number;
  getHeight(): number;
  getZr(): object;
  getDevicePixelRatio(): number;
}

export interface CustomElement {
  type: string;
  id?: string;
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
  extra?: Record<string, any>;
  invisible?: boolean;
  ignore?: boolean;
  textConfig?: object;
  textContent?: CustomElement;
  during?: (params: { setShape: (key: string, value: any) => void; setStyle: (key: string, value: any) => void; setExtra: (key: string, value: any) => void; getShape: (key: string) => any; getStyle: (key: string) => any }) => void;
  shape?: Record<string, any>;
  style?: Record<string, any>;
  children?: CustomElement[];
}

export interface CustomSeriesOption {
  type: "custom";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "polar" | "geo" | "none";
  xAxisIndex?: number;
  yAxisIndex?: number;
  polarIndex?: number;
  geoIndex?: number;
  renderItem: (params: CustomRenderParams, api: CustomSeriesAPI) => CustomElement;
  dimensions?: string[];
  encode?: EncodeOption;
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: any[];
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  animationDuration?: number;
  animationEasing?: string;
  color?: ThemeFamily;
}

export type SeriesOption =
  | LineSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | ScatterSeriesOption
  | RadarSeriesOption
  | HeatmapSeriesOption
  | CandlestickSeriesOption
  | BoxplotSeriesOption
  | GaugeSeriesOption
  | TreemapSeriesOption
  | FunnelSeriesOption
  | SankeySeriesOption
  | GraphSeriesOption
  | CustomSeriesOption;

// ─── Main chart option ────────────────────────────────────────────────────────
export interface ChartOption {
  title?: TitleOption | TitleOption[];
  legend?: LegendOption | LegendOption[];
  grid?: GridOption | GridOption[];
  xAxis?: AxisOption | AxisOption[];
  yAxis?: AxisOption | AxisOption[];
  polar?: PolarOption | PolarOption[];
  radiusAxis?: RadiusAxisOption | RadiusAxisOption[];
  angleAxis?: AngleAxisOption | AngleAxisOption[];
  radar?: RadarOption | RadarOption[];
  dataset?: DatasetOption | DatasetOption[];
  series?: SeriesOption[];
  tooltip?: TooltipOption;
  toolbox?: ToolboxOption;
  dataZoom?: DataZoomOption | DataZoomOption[];
  visualMap?: VisualMapOption | VisualMapOption[];
  brush?: BrushOption;
  animation?: boolean;
  animationThreshold?: number;
  animationDuration?: number;
  animationEasing?: string;
  animationDelay?: number | ((index: number, type: string) => number);
  animationDurationUpdate?: number;
  animationEasingUpdate?: string;
  animationDelayUpdate?: number | ((index: number, type: string) => number);
  progressive?: number;
  progressiveThreshold?: number;
  blendMode?: "source-over" | "lighter";
  hoverLayerThreshold?: number;
  useUTC?: boolean;
}

// ─── Internal render context ──────────────────────────────────────────────────
export interface ChartRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolvedCartesian {
  gridRect: ChartRect;
  xScales: ScaleInstance[];
  yScales: ScaleInstance[];
  xAxes: ResolvedAxis[];
  yAxes: ResolvedAxis[];
}

export interface ResolvedPolar {
  center: [number, number];
  radius: [number, number];
}

export interface ResolvedAxis {
  type: AxisType;
  scale: ScaleInstance;
  option: AxisOption;
  ticks: TickItem[];
  position: "top" | "bottom" | "left" | "right";
  offset: number;
}

export interface TickItem {
  value: number | string | Date;
  coord: number;
  label: string;
}

export interface ScaleInstance {
  type: AxisType;
  domain: [number, number] | string[] | Date[];
  range: [number, number];
  map(value: any): number;
  bandwidth(): number;
  ticks(count?: number): (number | string | Date)[];
  format(value: any): string;
}
