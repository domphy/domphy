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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  verticalAlign?: "top" | "middle" | "bottom";
  padding?: number | [number, number] | [number, number, number, number];
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  borderRadius?: number;
}

/**
 * Payload of the `selectchanged` event (ECharts shape): the WHOLE selection
 * after a `selectedMode` toggle, not just the datum that changed.
 */
export interface SelectChangedParams {
  type: "selectchanged";
  fromAction: "select" | "unselect";
  isFromClick: boolean;
  selected: { seriesIndex: number; dataIndex: number[] }[];
}

/** One drawn brush selection area, in pixel space. */
export interface BrushArea {
  brushType: "rect" | "lineX" | "lineY";
  /** Normalized [[minX, minY], [maxX, maxY]]. */
  range: [[number, number], [number, number]];
}

/**
 * Payload of the `brushSelected` event (ECharts shape, `batch` trimmed to
 * this build's single-brush-component support): every current area plus
 * the data indices, per series, that fall inside at least one of them.
 */
export interface BrushSelectedParams {
  type: "brushSelected";
  batch: {
    brushId: string;
    brushIndex: number;
    brushName: string;
    areas: BrushArea[];
    selected: { seriesIndex: number; dataIndex: number[] }[];
  }[];
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dashOffset?: number;
  opacity?: number;
  curveness?: number;
}

// ─── Item style ──────────────────────────────────────────────────────────────
/**
 * Geo/map region fill. ECharts spells the region fill `areaColor` here (not
 * `color`), because `color` on a map series is the palette array.
 */
export interface GeoItemStyleOption {
  areaColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  opacity?: number;
}

export interface ItemStyleOption {
  color?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  borderType?: "solid" | "dashed" | "dotted";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  global?: boolean;
}

export interface RadialGradient {
  type: "radial";
  x: number;
  y: number;
  r: number;
  colorStops: ColorStop[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  global?: boolean;
}

export type GradientObject = LinearGradient | RadialGradient;

// ─── Area style ──────────────────────────────────────────────────────────────
export interface AreaStyleOption {
  color?: ThemeFamily | GradientObject;
  opacity?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  origin?: "auto" | "start" | "end" | number;
}

// ─── Emphasis ─────────────────────────────────────────────────────────────────
export interface EmphasisOption {
  disabled?: boolean;
  scale?: boolean | number;
  /** Extra outer radius, in px, for an emphasised pie sector (ECharts: 10). */
  scaleSize?: number;
  focus?: "none" | "self" | "series" | "adjacency";
  blurScope?: "coordinateSystem" | "series" | "global";
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  areaStyle?: AreaStyleOption;
}

// ─── Label line ──────────────────────────────────────────────────────────────
export interface LabelLineOption {
  show?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showAbove?: boolean;
  length?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  length2?: number;
  smooth?: boolean | number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minTurnAngle?: number;
  lineStyle?: LineStyleOption;
}

// ─── Mark point ──────────────────────────────────────────────────────────────
export interface MarkPointOption {
  data?: MarkPointDataItem[];
  symbol?: SymbolType;
  symbolSize?:
    | number
    | [number, number]
    | ((value: any, params: any) => number);
  silent?: boolean;
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  precision?: number;
  label?: LabelOption;
  lineStyle?: LineStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  inside?: boolean;
  rotate?: number;
  margin?: number;
  formatter?: string | ((value: any, index: number) => string);
  color?: ThemeFamily;
  fontSize?: number;
  fontWeight?: "normal" | "bold" | "bolder" | "lighter" | number;
  align?: "left" | "center" | "right" | "auto";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  verticalAlign?: "top" | "middle" | "bottom";
  width?: number;
  overflow?: "truncate" | "break" | "breakAll" | "none";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  ellipsis?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  hideOverlap?: boolean;
}

export interface AxisLineOption {
  show?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  onZero?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  onZeroAxisIndex?: number;
  symbol?: SymbolType | [SymbolType, SymbolType];
  symbolSize?: [number, number];
  lineStyle?: LineStyleOption;
}

export interface AxisTickOption {
  show?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  alignWithLabel?: boolean;
  interval?: number | "auto";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  snap?: boolean;
  label?: LabelOption;
  lineStyle?: LineStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  shadowStyle?: ItemStyleOption;
  value?: number | string | Date;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  status?: "show" | "hide";
}

export interface AxisOption {
  id?: string;
  show?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  gridIndex?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
  position?: "top" | "bottom" | "left" | "right";
  offset?: number;
  type?: AxisType;
  name?: string;
  nameLocation?: "start" | "middle" | "center" | "end";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nameTextStyle?: {
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    align?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
    lineHeight?: number;
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nameGap?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nameRotate?: number;
  inverse?: boolean;
  boundaryGap?: boolean | [string | number, string | number];
  min?:
    | number
    | string
    | "dataMin"
    | ((value: { min: number; max: number }) => number);
  max?:
    | number
    | string
    | "dataMax"
    | ((value: { min: number; max: number }) => number);
  scale?: boolean;
  splitNumber?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minInterval?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxInterval?: number;
  interval?: number;
  logBase?: number;
  silent?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  triggerEvent?: boolean;
  axisLine?: AxisLineOption;
  axisTick?: AxisTickOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minorTick?: {
    show?: boolean;
    splitNumber?: number;
    length?: number;
    lineStyle?: LineStyleOption;
  };
  axisLabel?: AxisLabelOption;
  splitLine?: SplitLineOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minorSplitLine?: SplitLineOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  splitArea?: SplitAreaOption;
  data?: (
    | string
    | number
    | Date
    | { value: string | number | Date; textStyle?: object }
  )[];
  axisPointer?: AxisPointerOption;
  z?: number;
  zlevel?: number;
}

export interface RadiusAxisOption
  extends Omit<AxisOption, "position" | "gridIndex"> {
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
}

export interface AngleAxisOption
  extends Omit<AxisOption, "position" | "gridIndex"> {
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  sublink?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  subtarget?: "self" | "blank";
  subtextStyle?: {
    color?: ThemeFamily;
    fontStyle?: "normal" | "italic" | "oblique";
    fontWeight?: "normal" | "bold";
    fontSize?: number;
    lineHeight?: number;
  };
  textAlign?: "auto" | "left" | "center" | "right";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  textVerticalAlign?: "auto" | "top" | "middle" | "bottom";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  symbolKeepAspect?: boolean;
  formatter?: string | ((name: string) => string);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedMode?: boolean | "single" | "multiple";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  inactiveColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  inactiveBorderColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  data?: (
    | string
    | {
        name: string;
        icon?: SymbolType;
        itemStyle?: ItemStyleOption;
        lineStyle?: LineStyleOption;
      }
  )[];
  backgroundColor?: ThemeFamily;
  borderColor?: ThemeFamily;
  borderWidth?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  borderRadius?: number | [number, number, number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageButtonItemGap?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageButtonGap?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageButtonPosition?: "start" | "end";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageIconColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageIconInactiveColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageIconSize?: number | [number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pageTextStyle?: { color?: ThemeFamily; fontSize?: number };
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showContent?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  alwaysShowContent?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  triggerOn?: "mousemove" | "click" | "mousemove|click" | "none";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showDelay?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  hideDelay?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  enterable?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  renderMode?: "html" | "richText";
  confine?: boolean;
  appendToBody?: boolean;
  className?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
      ) =>
        | [number | string, number | string]
        | {
            top?: string | number;
            left?: string | number;
            right?: string | number;
            bottom?: string | number;
          });
  formatter?:
    | string
    | ((
        params: TooltipParams | TooltipParams[],
        ticket: string,
        callback: (ticket: string, html: string) => void,
      ) => string | DomphyElement);
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  marker?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  axisDim?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  axisIndex?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  axisType?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  axisId?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  axisValue?: string | number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
    saveAsImage?: {
      type?: "png" | "jpg" | "svg";
      name?: string;
      title?: string;
      show?: boolean;
    };
    restore?: { title?: string; show?: boolean };
    dataView?: {
      title?: string;
      show?: boolean;
      readOnly?: boolean;
      lang?: [string, string, string];
    };
    dataZoom?: {
      title?: { zoom?: string; back?: string };
      show?: boolean;
      filterMode?: "filter" | "weakFilter" | "empty" | "none";
      xAxisIndex?: number | number[] | "none" | false;
      yAxisIndex?: number | number[] | "none" | false;
    };
    magicType?: {
      type?: ("line" | "bar" | "stack")[];
      title?: { line?: string; bar?: string; stack?: string; tiled?: string };
      show?: boolean;
    };
    brush?: {
      type?: ("rect" | "polygon" | "lineX" | "lineY" | "keep" | "clear")[];
      title?: Record<string, string>;
      show?: boolean;
    };
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  radiusAxisIndex?: number | number[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  angleAxisIndex?: number | number[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  filterMode?: "filter" | "weakFilter" | "empty" | "none";
  start?: number;
  end?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  startValue?: number | string | Date;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  endValue?: number | string | Date;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minSpan?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxSpan?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minValueSpan?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxValueSpan?: number;
  orient?: OrientType;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  zoomLock?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  throttle?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  rangeMode?: ["value" | "percent", "value" | "percent"];
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  width?: number | string;
  height?: number | string;
  borderColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  borderRadius?: number;
  backgroundColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dataBackground?: { lineStyle?: LineStyleOption; areaStyle?: AreaStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedDataBackground?: {
    lineStyle?: LineStyleOption;
    areaStyle?: AreaStyleOption;
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  fillerColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleSize?: number | string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleIcon?: SymbolType;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  moveHandleStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  moveHandleSize?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelPrecision?: number | "auto";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelFormatter?:
    | string
    | ((value: number | string, valueStr: string) => string);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showDetail?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showDataShadow?: "auto" | boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  realtime?: boolean;
  textStyle?: { color?: ThemeFamily; fontSize?: number };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  brushSelect?: boolean;
  brushStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: {
    handleStyle?: ItemStyleOption;
    moveHandleStyle?: ItemStyleOption;
  };
  z?: number;
  zlevel?: number;
}

export interface DataZoomInsideOption {
  type: "inside";
  id?: string;
  disabled?: boolean;
  xAxisIndex?: number | number[];
  yAxisIndex?: number | number[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  filterMode?: "filter" | "weakFilter" | "empty" | "none";
  start?: number;
  end?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  startValue?: number | string | Date;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  endValue?: number | string | Date;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minSpan?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxSpan?: number;
  orient?: OrientType;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  zoomLock?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  throttle?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  rangeMode?: ["value" | "percent", "value" | "percent"];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  zoomOnMouseWheel?: boolean | "shift" | "ctrl" | "alt";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  moveOnMouseMove?: boolean | "shift" | "ctrl" | "alt";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  moveOnMouseWheel?: boolean | "shift" | "ctrl" | "alt";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  calculable?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  realtime?: boolean;
  inverse?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  precision?: number;
  itemWidth?: number;
  itemHeight?: number;
  align?: "auto" | "left" | "right" | "top" | "bottom";
  text?: [string, string];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  textGap?: number;
  show?: boolean;
  dimension?: number;
  seriesIndex?: number | number[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  hoverLink?: boolean;
  inRange?: {
    color?: ThemeFamily[];
    opacity?: number;
    symbol?: SymbolType;
    symbolSize?: [number, number];
  };
  outOfRange?: { color?: ThemeFamily[]; opacity?: number };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleIcon?: SymbolType;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleSize?: number | string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  handleStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  indicatorIcon?: SymbolType;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  indicatorSize?: number | string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minOpen?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxOpen?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedMode?: "multiple" | "single";
  inverse?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  precision?: number;
  itemWidth?: number;
  itemHeight?: number;
  align?: "auto" | "left" | "right";
  text?: [string, string];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  textGap?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showLabel?: boolean;
  itemGap?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  itemSymbol?: SymbolType;
  show?: boolean;
  dimension?: number;
  seriesIndex?: number | number[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  hoverLink?: boolean;
  inRange?: { color?: ThemeFamily[]; opacity?: number; symbol?: SymbolType };
  outOfRange?: { color?: ThemeFamily[]; opacity?: number };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  formatter?:
    | string
    | ((value: number | string, value2: number | string) => string);
  z?: number;
  zlevel?: number;
}

export type VisualMapOption =
  | VisualMapContinuousOption
  | VisualMapPiecewiseOption;

// ─── Brush ────────────────────────────────────────────────────────────────────
export interface BrushOption {
  id?: string;
  toolbox?: ("rect" | "polygon" | "lineX" | "lineY" | "keep" | "clear")[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  brushLink?: number[] | "all" | "none";
  seriesIndex?: number[] | "all" | "none";
  geoIndex?: number[] | "all" | "none";
  xAxisIndex?: number[] | "all" | "none";
  yAxisIndex?: number[] | "all" | "none";
  brushType?: "rect" | "polygon" | "lineX" | "lineY";
  brushMode?: "single" | "multiple";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  transformable?: boolean;
  brushStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  throttleType?: "debounce" | "fixRate";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  throttleDelay?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  removeOnClick?: boolean;
  inBrush?: {
    color?: ThemeFamily[];
    opacity?: number;
    symbol?: SymbolType;
    symbolSize?: [number, number];
  };
  outOfBrush?: { color?: ThemeFamily[]; opacity?: number };
  z?: number;
}

// ─── Dataset ──────────────────────────────────────────────────────────────────
export interface DatasetOption {
  id?: string;
  source?: any[][] | Record<string, any[]> | Record<string, any>[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: (
    | string
    | {
        name: string;
        type?: "ordinal" | "number" | "float" | "int" | "time";
        displayName?: string;
      }
  )[];
  sourceHeader?: boolean;
  transform?: TransformOption[];
  fromDatasetIndex?: number;
  fromDatasetId?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  fromTransformResult?: number;
}

export interface TransformOption {
  type: "filter" | "sort" | string;
  config?: Record<string, any>;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  itemId?: string | number;
  itemName?: string | number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
  symbol?: SymbolType;
  symbolSize?:
    | number
    | [number, number]
    | ((value: any, params: any) => number);
  symbolRotate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  symbolKeepAspect?: boolean;
  symbolOffset?: [number | string, number | string];
  showSymbol?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showAllSymbol?: boolean | "auto";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  hoverAnimation?: boolean;
  legendHoverLink?: boolean;
  stack?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  stackStrategy?: "samesign" | "all" | "positive" | "negative";
  cursor?: string;
  connectNulls?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  clip?: boolean;
  step?: false | "start" | "middle" | "end";
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  endLabel?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  areaStyle?: AreaStyleOption;
  emphasis?: EmphasisOption;
  blur?: {
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    areaStyle?: AreaStyleOption;
  };
  select?: {
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    areaStyle?: AreaStyleOption;
  };
  selectedMode?: boolean | "single" | "multiple" | "series";
  smooth?: boolean | number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  smoothMonotone?: "x" | "y" | "none";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  sampling?: "lttb" | "average" | "min" | "max" | "minmax" | "sum";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: (
    | number
    | null
    | undefined
    | [number | string | Date, number]
    | {
        value: number | null;
        name?: string;
        itemStyle?: ItemStyleOption;
        label?: LabelOption;
        emphasis?: EmphasisOption;
      }
  )[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
  legendHoverLink?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  coordinateSystemIndex?: number;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  stack?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  stackStrategy?: "samesign" | "all" | "positive" | "negative";
  cursor?: string;
  barWidth?: number | string;
  barMaxWidth?: number | string;
  barMinWidth?: number | string;
  barMinHeight?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  barMinAngle?: number;
  barGap?: string;
  barCategoryGap?: string;
  large?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  largeThreshold?: number;
  progressive?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveChunkMode?: "mod" | "sequential";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: (
    | number
    | null
    | undefined
    | [number | string | Date, number]
    | {
        value: number | null;
        name?: string;
        itemStyle?: ItemStyleOption;
        label?: LabelOption;
        emphasis?: EmphasisOption;
      }
  )[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  clip?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  realtimeSort?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showBackground?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  backgroundStyle?: ItemStyleOption & {
    borderRadius?: number | [number, number, number, number];
  };
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  borderRadius?: number | [number, number, number, number];
}

export interface PieDataItem {
  name?: string;
  value: number;
  selected?: boolean;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minAngle?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minShowLabelAngle?: number;
  roseType?: false | "radius" | "area";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  avoidLabelOverlap?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  stillShowZeroSum?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  percentPrecision?: number;
  cursor?: string;
  center?: [string | number, string | number];
  radius?: string | number | [string | number, string | number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: PieDataItem[];
  label?: LabelOption & {
    position?: "outside" | "inside" | "inner" | "center";
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLine?: LabelLineOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  borderRadius?: number | [number, number, number, number];
}

export interface ScatterSeriesOption {
  type: "scatter";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "polar" | "geo";
  xAxisIndex?: number;
  yAxisIndex?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
  geoIndex?: number;
  legendHoverLink?: boolean;
  symbol?: SymbolType;
  symbolSize?:
    | number
    | [number, number]
    | ((value: any, params: any) => number);
  symbolRotate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  symbolKeepAspect?: boolean;
  symbolOffset?: [number | string, number | string];
  large?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  largeThreshold?: number;
  cursor?: string;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  progressive?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveChunkMode?: "mod" | "sequential";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: (
    | number
    | null
    | undefined
    | number[]
    | {
        value: number | number[];
        name?: string;
        itemStyle?: ItemStyleOption;
        label?: LabelOption;
        emphasis?: EmphasisOption;
        symbol?: SymbolType;
        symbolSize?: number;
      }
  )[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface RadarIndicator {
  name?: string;
  /** Axis maximum. Derived from the series data when omitted (ECharts does the same). */
  max?: number;
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  axisName?: {
    show?: boolean;
    formatter?: string | ((name: string) => string);
    color?: ThemeFamily;
    fontSize?: number;
    fontWeight?: "normal" | "bold";
    backgroundColor?: ThemeFamily;
    borderRadius?: number;
    padding?: number | [number, number];
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nameGap?: number;
  splitNumber?: number;
  shape?: "polygon" | "circle";
  scale?: boolean;
  silent?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  triggerEvent?: boolean;
  axisLine?: AxisLineOption;
  axisTick?: AxisTickOption;
  axisLabel?: AxisLabelOption;
  splitLine?: SplitLineOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  symbolKeepAspect?: boolean;
  legendHoverLink?: boolean;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLayout?: object;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  areaStyle?: AreaStyleOption;
  emphasis?: EmphasisOption;
  blur?: {
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    areaStyle?: AreaStyleOption;
  };
  select?: {
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    areaStyle?: AreaStyleOption;
  };
  selectedMode?: boolean | "single" | "multiple" | "series";
  data?: {
    name?: string;
    value: number[];
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    areaStyle?: AreaStyleOption;
    emphasis?: EmphasisOption;
    symbol?: SymbolType;
    symbolSize?: number;
  }[];
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blurSize?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  pointSize?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxOpacity?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minOpacity?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: [number, number, number][];
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  progressive?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  largeThreshold?: number;
  progressive?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveChunkMode?: "mod" | "sequential";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?:
    | [number, number, number, number][]
    | { value: [number, number, number, number]; itemStyle?: object }[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  clip?: boolean;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelayUpdate?: number | ((index: number) => number);
  upColor?: ThemeFamily;
  downColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  upBorderColor?: ThemeFamily;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  boxWidth?: [number | string, number | string];
  itemStyle?: ItemStyleOption;
  emphasis?: EmphasisOption;
  blur?: { itemStyle?: ItemStyleOption };
  select?: { itemStyle?: ItemStyleOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?:
    | [number, number, number, number, number][]
    | {
        value: [number, number, number, number, number];
        name?: string;
        itemStyle?: ItemStyleOption;
      }[];
  markPoint?: MarkPointOption;
  markLine?: MarkLineOption;
  markArea?: MarkAreaOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface GaugeDataItem {
  name?: string;
  value: number;
  detail?: {
    offsetCenter?: [string | number, string | number];
    formatter?: string | ((value: number) => string);
  };
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
    lineStyle?: {
      width?: number;
      color?: [number, ThemeFamily][];
      shadowBlur?: number;
      opacity?: number;
    };
  };
  splitLine?: {
    show?: boolean;
    distance?: number;
    length?: number;
    lineStyle?: LineStyleOption;
  };
  axisTick?: {
    show?: boolean;
    splitNumber?: number;
    distance?: number;
    length?: number;
    lineStyle?: LineStyleOption;
  };
  axisLabel?: AxisLabelOption & {
    distance?: number;
    formatter?: string | ((value: number) => string);
  };
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  color?: ThemeFamily;
}

export interface TreemapLevelOption {
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visualDimension?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visualMin?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visualMax?: number;
  color?: ThemeFamily[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  colorAlpha?: [number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  colorSaturation?: number | [number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  colorMappingBy?: "value" | "index" | "id";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visibleMin?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  childrenVisibleMin?: number;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  upperLabel?: LabelOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: object;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: object;
}

export interface TreemapDataItem {
  id?: string;
  name?: string;
  value: number | number[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  groupId?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  childGroupId?: string;
  children?: TreemapDataItem[];
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  upperLabel?: LabelOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: object;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: object;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  squareRatio?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  leafDepth?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  drillDownIcon?: string;
  roam?: boolean | "scale" | "move";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nodeClick?: false | "zoomToNode" | "link";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  zoomToNodeRatio?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  universalTransition?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visualDimension?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visualMin?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visualMax?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  colorAlpha?: [number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  colorSaturation?: number | [number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  colorMappingBy?: "value" | "index" | "id";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  visibleMin?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  childrenVisibleMin?: number;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  upperLabel?: LabelOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: object;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: object;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedMode?: boolean | "single" | "multiple";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  levels?: TreemapLevelOption[];
  data?: TreemapDataItem[];
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelayUpdate?: number | ((index: number) => number);
  color?: ThemeFamily[];
}

export interface FunnelDataItem {
  name?: string;
  value: number;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLine?: LabelLineOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  color?: ThemeFamily;
}

export interface FunnelSeriesOption {
  type: "funnel";
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  minSize?: string | number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  maxSize?: string | number;
  orient?: OrientType;
  sort?:
    | "descending"
    | "ascending"
    | "none"
    | ((a: FunnelDataItem, b: FunnelDataItem) => number);
  gap?: number;
  legendHoverLink?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  funnelAlign?: "left" | "right" | "center";
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  width?: string | number;
  height?: string | number;
  label?: LabelOption & {
    position?:
      | "left"
      | "right"
      | "inside"
      | "rightTop"
      | "rightBottom"
      | "leftTop"
      | "leftBottom"
      | "insideRight"
      | "insideLeft";
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  focusNodeAdjacency?: boolean;
  color?: ThemeFamily;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
  lineStyle?: LineStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { lineStyle?: LineStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: { lineStyle?: LineStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nodeAlign?: "justify" | "left" | "right";
  orient?: OrientType;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  draggable?: boolean;
  layoutIterations?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedMode?: boolean | "single" | "multiple" | "series";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  levels?: object[];
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption & { curveness?: number };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: {
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: {
    label?: LabelOption;
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  focusNodeAdjacency?: boolean | "allEdges" | "outEdges" | "inEdges";
  data?: SankeyNode[];
  nodes?: SankeyNode[];
  links?: SankeyLink[];
  edges?: SankeyLink[];
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  draggable?: boolean;
  cursor?: string;
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { lineStyle?: LineStyleOption; label?: LabelOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: { lineStyle?: LineStyleOption; label?: LabelOption };
  symbol?: SymbolType | [SymbolType, SymbolType];
  symbolSize?: number | [number, number];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  ignoreForceLayout?: boolean;
}

export interface GraphCategory {
  name?: string;
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: { label?: LabelOption; itemStyle?: ItemStyleOption };
  color?: ThemeFamily;
}

export interface GraphSeriesOption {
  type: "graph";
  id?: string;
  name?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  legendHoverLink?: boolean;
  coordinateSystem?: "none" | "cartesian2d" | "polar" | "geo";
  xAxisIndex?: number;
  yAxisIndex?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
  geoIndex?: number;
  calendarIndex?: number;
  center?: [string | number, string | number];
  zoom?: number;
  layout?: "none" | "circular" | "force";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  draggable?: boolean;
  edgeSymbol?: SymbolType | [SymbolType, SymbolType];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  edgeSymbolSize?: number | [number, number];
  cursor?: string;
  itemStyle?: ItemStyleOption;
  lineStyle?: LineStyleOption;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  edgeLabel?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  labelLayout?: object;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blur?: {
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    label?: LabelOption;
    edgeLabel?: LabelOption;
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  select?: {
    itemStyle?: ItemStyleOption;
    lineStyle?: LineStyleOption;
    label?: LabelOption;
    edgeLabel?: LabelOption;
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedMode?: boolean | "single" | "multiple" | "series";
  symbol?: SymbolType;
  symbolSize?: number | [number, number];
  categories?: GraphCategory[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dataIndexInside: number;
  dataIndex: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  actionType?: string;
}

export interface CustomSeriesAPI {
  value(dim: number | string, dataIndexInside?: number): number;
  ordinalRawValue(
    dim: number | string,
    dataIndexInside?: number,
  ): string | number;
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  textConfig?: object;
  textContent?: CustomElement;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  during?: (params: {
    setShape: (key: string, value: any) => void;
    setStyle: (key: string, value: any) => void;
    setExtra: (key: string, value: any) => void;
    getShape: (key: string) => any;
    getStyle: (key: string) => any;
  }) => void;
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
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  polarIndex?: number;
  geoIndex?: number;
  renderItem: (
    params: CustomRenderParams,
    api: CustomSeriesAPI,
  ) => CustomElement;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  dimensions?: string[];
  encode?: EncodeOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  seriesLayoutBy?: "column" | "row";
  datasetIndex?: number;
  data?: any[];
  z?: number;
  zlevel?: number;
  silent?: boolean;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  color?: ThemeFamily;
  /**
   * Only `emphasis.itemStyle` is read, by `api.styleEmphasis()` inside your
   * own `renderItem` — there is no automatic per-datum hover detection for a
   * custom series (unlike line/bar/scatter/pie), so nothing calls it for you.
   * @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md
   */
  emphasis?: EmphasisOption;
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
export interface CalendarOption {
  id?: string;
  range: string | [string, string];
  cellSize?: number | "auto" | [number | "auto", number | "auto"];
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  orient?: "horizontal" | "vertical";
  dayLabel?: {
    show?: boolean;
    nameMap?: string[];
    firstDay?: number;
    margin?: number;
  };
  monthLabel?: {
    show?: boolean;
    nameMap?: string[];
  };
  yearLabel?: {
    show?: boolean;
    margin?: number;
  };
}

// ─── Parallel ─────────────────────────────────────────────────────────────────
export interface ParallelOption {
  id?: string;
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  layout?: "horizontal" | "vertical";
}

export interface ParallelAxisOption {
  dim: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  parallelIndex?: number;
  name?: string;
  type?: "value" | "category" | "time" | "log";
  min?: number | string;
  max?: number | string;
  data?: string[];
  axisLabel?: { show?: boolean; formatter?: (v: any) => string };
  splitLine?: { show?: boolean };
  axisLine?: { show?: boolean };
  axisTick?: { show?: boolean };
}

export interface ParallelSeriesOption {
  type: "parallel";
  id?: string;
  name?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  parallelIndex?: number;
  data?: number[][];
  lineStyle?: LineStyleOption;
  color?: ThemeFamily;
  smooth?: boolean;
  label?: LabelOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

// ─── ThemeRiver ───────────────────────────────────────────────────────────────
export interface ThemeRiverSeriesOption {
  type: "themeRiver";
  id?: string;
  name?: string;
  data?: [number | string, number, string][];
  boundaryGap?: [string, string];
  label?: LabelOption;
  color?: ThemeFamily[];
  left?: number | string;
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

// ─── Geo / Map ────────────────────────────────────────────────────────────────
export interface GeoRegion {
  name: string;
  itemStyle?: GeoItemStyleOption;
  label?: LabelOption;
  selected?: boolean;
  silent?: boolean;
}

export interface GeoOption {
  id?: string;
  map: string;
  /** Pan/zoom with drag + wheel. `"scale"` = wheel only, `"move"` = drag only. */
  roam?: boolean | "scale" | "move";
  /** Roam zoom bounds. Unbounded when omitted, as in ECharts. */
  scaleLimit?: { min?: number; max?: number };
  center?: [number, number];
  zoom?: number;
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  regions?: GeoRegion[];
  silent?: boolean;
  itemStyle?: GeoItemStyleOption;
  label?: LabelOption;
}

export interface MapDataItem {
  name: string;
  value?: number;
  selected?: boolean;
  itemStyle?: GeoItemStyleOption;
  label?: LabelOption;
}

export interface MapSeriesOption {
  type: "map";
  id?: string;
  name?: string;
  map: string;
  data?: MapDataItem[];
  geoIndex?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  nameProperty?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  selectedMode?: boolean | "single" | "multiple";
  /** Pan/zoom the map with drag + wheel. `"scale"` = wheel only, `"move"` = drag only. */
  roam?: boolean | "scale" | "move";
  /** Roam zoom bounds. Unbounded when omitted, as in ECharts. */
  scaleLimit?: { min?: number; max?: number };
  center?: [number, number];
  zoom?: number;
  label?: LabelOption;
  itemStyle?: GeoItemStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  emphasis?: EmphasisOption;
  color?: ThemeFamily[];
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

// ─── 3D ──────────────────────────────────────────────────────────────────────
export interface Grid3DOption {
  id?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  boxWidth?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  boxHeight?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  boxDepth?: number;
  viewControl?: {
    projection?: "perspective" | "orthographic";
    alpha?: number;
    beta?: number;
    distance?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
  };
  left?: string | number;
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  width?: string | number;
  height?: string | number;
}

export interface Axis3DOption {
  type?: "value" | "category" | "time" | "log";
  name?: string;
  min?: number | string;
  max?: number | string;
  data?: (string | number)[];
  axisLabel?: { show?: boolean; formatter?: (v: any) => string };
  splitLine?: { show?: boolean };
  axisLine?: { show?: boolean };
  axisTick?: { show?: boolean };
}

export interface Scatter3DSeriesOption {
  type: "scatter3D";
  id?: string;
  name?: string;
  data?: (
    | [number, number, number]
    | { value: [number, number, number]; name?: string }
  )[];
  symbolSize?: number;
  color?: ThemeFamily;
  itemStyle?: ItemStyleOption;
  label?: LabelOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  grid3DIndex?: number;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

export interface Bar3DSeriesOption {
  type: "bar3D";
  id?: string;
  name?: string;
  data?: (
    | [number, number, number]
    | { value: [number, number, number]; name?: string }
  )[];
  barSize?: number;
  color?: ThemeFamily;
  itemStyle?: ItemStyleOption;
  label?: LabelOption;
  /**
   * `"color"` (default) paints every face the flat series color; `"lambert"`
   * shades each face by its angle to a fixed light, as ECharts-GL does.
   */
  shading?: "color" | "lambert";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  grid3DIndex?: number;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

export interface Line3DSeriesOption {
  type: "line3D";
  id?: string;
  name?: string;
  data?: ([number, number, number] | { value: [number, number, number] })[];
  lineWidth?: number;
  color?: ThemeFamily;
  lineStyle?: LineStyleOption;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  grid3DIndex?: number;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

export interface Surface3DSeriesOption {
  type: "surface3D";
  id?: string;
  name?: string;
  // Structured grid data: provide shapeW * shapeH points in row-major order
  // Each point: [x, y, z]
  data?: ([number, number, number] | { value: [number, number, number] })[];
  // Grid dimensions — if omitted, assumes sqrt(data.length) × sqrt(data.length)
  shapeW?: number;
  shapeH?: number;
  // Color mapped by z-value. Uses visualMap if present, otherwise theme gradient.
  color?: ThemeFamily;
  itemStyle?: ItemStyleOption;
  /** `"lambert"` shades each quad by its normal; `"color"` (default) is flat. */
  shading?: "color" | "lambert";
  wireframe?: { show?: boolean; lineStyle?: LineStyleOption };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  grid3DIndex?: number;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

// ─── Lines (flow map) ────────────────────────────────────────────────────────
export interface LinesDataItem {
  coords: [[number, number], [number, number]]; // [[fromLng, fromLat], [toLng, toLat]]
  name?: string;
  lineStyle?: LineStyleOption;
  effect?: { show?: boolean };
}

export interface LinesSeriesOption {
  type: "lines";
  id?: string;
  name?: string;
  coordinateSystem?: "geo" | "cartesian2d";
  geoIndex?: number;
  data?: LinesDataItem[];
  lineStyle?: LineStyleOption;
  effect?: {
    show?: boolean;
    period?: number;
    symbol?: SymbolType;
    symbolSize?: number;
    color?: string;
    trailLength?: number;
  };
  color?: ThemeFamily;
  large?: boolean;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

// ─── EffectScatter ────────────────────────────────────────────────────────────
export interface EffectScatterSeriesOption {
  type: "effectScatter";
  id?: string;
  name?: string;
  coordinateSystem?: "cartesian2d" | "geo";
  xAxisIndex?: number;
  yAxisIndex?: number;
  geoIndex?: number;
  data?:
    | [number, number][]
    | [number, number, number][]
    | { name?: string; value: number[] }[];
  symbolSize?: number | ((val: number[]) => number);
  rippleEffect?: {
    period?: number;
    scale?: number;
    brushType?: "fill" | "stroke";
  };
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  showEffectOn?: "render" | "emphasis";
  color?: ThemeFamily;
  itemStyle?: ItemStyleOption;
  label?: LabelOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
}

// ─── PictorialBar ────────────────────────────────────────────────────────────
export interface PictorialBarSeriesOption {
  type: "pictorialBar";
  id?: string;
  name?: string;
  xAxisIndex?: number;
  yAxisIndex?: number;
  data?: (
    | number
    | { value: number; name?: string; itemStyle?: ItemStyleOption }
  )[];
  symbol?: SymbolType | `path://${string}`;
  symbolSize?: number | [number, number];
  symbolRepeat?: boolean | number;
  symbolOffset?: [string | number, string | number];
  symbolRotate?: number;
  symbolClip?: boolean;
  /** Gap between repeated symbols: px, or a percentage of the symbol size. */
  symbolMargin?: number | string;
  barWidth?: number | string;
  barMaxWidth?: number | string;
  barMinWidth?: number | string;
  barGap?: string;
  barCategoryGap?: string;
  /** `"series"` (default) colors every item by series; `"data"` walks the palette per item. */
  colorBy?: "series" | "data";
  color?: ThemeFamily;
  label?: LabelOption;
  itemStyle?: ItemStyleOption;
  z?: number;
  zlevel?: number;
  silent?: boolean;
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
  | CustomSeriesOption
  | ParallelSeriesOption
  | ThemeRiverSeriesOption
  | MapSeriesOption
  | LinesSeriesOption
  | EffectScatterSeriesOption
  | PictorialBarSeriesOption
  | Scatter3DSeriesOption
  | Bar3DSeriesOption
  | Line3DSeriesOption
  | Surface3DSeriesOption;

// ─── Main chart option ────────────────────────────────────────────────────────
export interface ChartOption {
  title?: TitleOption | TitleOption[];
  legend?: LegendOption | LegendOption[];
  grid?: GridOption | GridOption[];
  xAxis?: AxisOption | AxisOption[];
  yAxis?: AxisOption | AxisOption[];
  polar?: PolarOption | PolarOption[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  radiusAxis?: RadiusAxisOption | RadiusAxisOption[];
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  angleAxis?: AngleAxisOption | AngleAxisOption[];
  radar?: RadarOption | RadarOption[];
  dataset?: DatasetOption | DatasetOption[];
  series?: SeriesOption[];
  calendar?: CalendarOption | CalendarOption[];
  parallel?: ParallelOption | ParallelOption[];
  parallelAxis?: ParallelAxisOption | ParallelAxisOption[];
  geo?: GeoOption | GeoOption[];
  grid3D?: Grid3DOption | Grid3DOption[];
  xAxis3D?: Axis3DOption | Axis3DOption[];
  yAxis3D?: Axis3DOption | Axis3DOption[];
  zAxis3D?: Axis3DOption | Axis3DOption[];
  tooltip?: TooltipOption;
  toolbox?: ToolboxOption;
  dataZoom?: DataZoomOption | DataZoomOption[];
  visualMap?: VisualMapOption | VisualMapOption[];
  brush?: BrushOption;
  animation?: boolean;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDuration?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasing?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelay?: number | ((index: number, type: string) => number);
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDurationUpdate?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationEasingUpdate?: string;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  animationDelayUpdate?: number | ((index: number, type: string) => number);
  progressive?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  progressiveThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  blendMode?: "source-over" | "lighter";
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
  hoverLayerThreshold?: number;
  /** @deprecated Not implemented by @domphy/chart — ignored. See docs/chart/vs-echarts.md */
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
