import type { ColorResolver, Rgba } from "./gl/color.js";
import type {
  BrushOption,
  EmphasisOption,
  ItemStyleOption,
  LabelOption,
  SeriesOption,
} from "./types.js";

/**
 * ECharts interaction states. A chart element is in exactly one of them at a
 * time; `normal` is the resting state and costs nothing to resolve.
 *
 * Reference: ECharts "emphasis / blur / select" (echarts/src/util/states.ts).
 */
export type ItemStateName = "normal" | "emphasis" | "blur" | "select";

/**
 * A state's visual delta. It is applied to the colour the renderer has ALREADY
 * resolved, not to the option's colour string: series colours are theme
 * `var(--…)` references that cannot be multiplied before resolution.
 */
export interface ItemStateVisual {
  name: ItemStateName;
  /** Explicit colour from the state's `itemStyle.color` (still unresolved). */
  color?: unknown;
  /** Multiplied into the alpha channel. */
  opacity: number;
  /**
   * RGB multiplier. ECharts' default emphasis calls zrender `lift(color, -0.1)`
   * — each channel × 1.1, clamped — so the hovered element reads as brighter
   * without the caller declaring anything (echarts/src/util/states.ts
   * `liftColor`). 1 leaves the colour untouched.
   */
  lift: number;
  /** Symbol radius / pie outer-radius multiplier. 1 leaves the size alone. */
  scale: number;
  /** Extra outer radius in px (pie `emphasis.scaleSize`). */
  scaleSize: number;
  /** Radial offset in px (pie `selectedOffset` on the select state). */
  offset: number;
  /** The state's own `itemStyle`, for border/opacity reads the renderer wants. */
  itemStyle?: ItemStyleOption;
  /** The state's own `label`, so an emphasised item can reveal a label. */
  label?: LabelOption;
}

export const NORMAL_STATE: ItemStateVisual = {
  name: "normal",
  opacity: 1,
  lift: 1,
  scale: 1,
  scaleSize: 0,
  offset: 0,
};

/**
 * A `dataIndex` of -1 asks for the series as a whole — a line's stroke and area
 * are one element, not one per datum.
 */
export type ItemStateResolver = (
  series: SeriesOption,
  dataIndex: number,
) => ItemStateVisual;

/** Resolver used when nothing is hovered, focused or selected. */
export const NO_ITEM_STATES: ItemStateResolver = () => NORMAL_STATE;

/**
 * ECharts' default blur opacity: a blurred element keeps its colour and drops
 * to a tenth of its alpha, which is what makes `emphasis.focus` read as "the
 * rest of the chart stepped back". Override per series with
 * `blur.itemStyle.opacity`.
 */
const BLUR_OPACITY = 0.1;

/**
 * ECharts' default emphasis lift: zrender `lift(color, -0.1)` multiplies each
 * channel by 1.1 (echarts/src/util/states.ts `liftColor`).
 */
const EMPHASIS_LIFT = 1.1;

/**
 * Default symbol enlargement for `emphasis.scale: true`. `emphasis.scale` may
 * also be given as the ratio itself (ECharts accepts `boolean | number`).
 */
const EMPHASIS_SCALE = 1.1;

/** ECharts' default `emphasis.scaleSize` for pie: +10px of outer radius. */
const PIE_EMPHASIS_SCALE_SIZE = 10;

/** ECharts' default `selectedOffset` for pie: the slice slides out 10px. */
const PIE_SELECTED_OFFSET = 10;

/** Series whose default `emphasis.scale` is on, because they draw symbols. */
const SYMBOL_SERIES = new Set(["scatter", "effectScatter", "line"]);

type StatefulSeries = SeriesOption & {
  emphasis?: EmphasisOption;
  blur?: { itemStyle?: ItemStyleOption; label?: LabelOption };
  select?: { itemStyle?: ItemStyleOption; label?: LabelOption };
  selectedMode?: boolean | "single" | "multiple" | "series";
  selectedOffset?: number;
  legendHoverLink?: boolean;
  coordinateSystem?: string;
};

/**
 * Whether any series asks for interaction states. When none does, the engine
 * skips hover tracking entirely and never re-renders on pointer move — an
 * ECharts option that says nothing about emphasis costs nothing.
 */
export function itemStatesEnabled(series: readonly SeriesOption[]): boolean {
  return series.some((entry) => {
    const s = entry as StatefulSeries;
    if (s.emphasis != null && s.emphasis.disabled !== true) return true;
    if (s.blur != null) return true;
    if (s.select != null) return true;
    return s.selectedMode != null && s.selectedMode !== false;
  });
}

/** Whether a click on this series toggles selection, per ECharts. */
export function selectedModeOf(
  series: SeriesOption | undefined,
): false | "single" | "multiple" | "series" {
  const mode = (series as StatefulSeries | undefined)?.selectedMode;
  if (mode == null || mode === false) return false;
  if (mode === true) return "multiple";
  return mode;
}

/** The key a selected datum is stored under. */
export function selectionKey(
  seriesIndex: number,
  dataIndex: number,
): `${number}:${number}` {
  return `${seriesIndex}:${dataIndex}`;
}

/**
 * The coordinate system a series is painted into, for `blurScope`.
 * ECharts resolves this from the series' own `coordinateSystem`; the
 * self-contained series (pie, funnel, …) each form their own system.
 */
function coordinateSystemOf(series: SeriesOption): string {
  const declared = (series as StatefulSeries).coordinateSystem;
  if (declared) return declared;
  const type = series.type ?? "";
  if (type === "pie" || type === "funnel" || type === "gauge") return type;
  if (type === "radar") return "radar";
  if (type === "treemap" || type === "sankey" || type === "graph") return type;
  return "cartesian2d";
}

export interface ItemStateInput {
  /** Every series, in `option.series` order — the index space of `hover`. */
  series: readonly SeriesOption[];
  /** The datum under the pointer, or null. */
  hover: { seriesIndex: number; dataIndex: number } | null;
  /**
   * A series highlighted from its legend item (hover OR keyboard focus, so the
   * keyboard reaches the same affordance). ECharts calls this legendHoverLink.
   */
  focusSeriesIndex: number | null;
  /** Selected data, keyed by {@link selectionKey}. */
  selected: ReadonlySet<string>;
  /**
   * Maps a series OBJECT to its index in `series`. The renderers are handed
   * clones — the palette pass and the stacking pass both spread the option —
   * so identity alone would not find the original. The engine registers every
   * clone here before it calls a renderer, and the map is read at call time.
   */
  indexOf?: ReadonlyMap<object, number>;
}

function emphasisVisual(
  series: StatefulSeries,
  emphasis: EmphasisOption | undefined,
): ItemStateVisual {
  const itemStyle = emphasis?.itemStyle;
  const scaleOption = emphasis?.scale;
  const symbolDefault = SYMBOL_SERIES.has(series.type ?? "");
  const scale =
    typeof scaleOption === "number"
      ? scaleOption
      : scaleOption === false
        ? 1
        : scaleOption === true || symbolDefault
          ? EMPHASIS_SCALE
          : 1;
  return {
    name: "emphasis",
    color: itemStyle?.color,
    opacity: itemStyle?.opacity ?? 1,
    // An explicit emphasis colour is taken as given; the lift is only the
    // default that makes an undeclared emphasis visible at all.
    lift: itemStyle?.color != null ? 1 : EMPHASIS_LIFT,
    scale,
    scaleSize:
      series.type === "pie" && emphasis?.scale !== false
        ? (emphasis?.scaleSize ?? PIE_EMPHASIS_SCALE_SIZE)
        : 0,
    offset: 0,
    itemStyle,
    label: emphasis?.label,
  };
}

function blurVisual(series: StatefulSeries): ItemStateVisual {
  const itemStyle = series.blur?.itemStyle;
  return {
    name: "blur",
    color: itemStyle?.color,
    opacity: itemStyle?.opacity ?? BLUR_OPACITY,
    lift: 1,
    scale: 1,
    scaleSize: 0,
    offset: 0,
    itemStyle,
    label: series.blur?.label,
  };
}

function selectVisual(series: StatefulSeries): ItemStateVisual {
  const itemStyle = series.select?.itemStyle;
  const declared = itemStyle != null;
  return {
    name: "select",
    color: itemStyle?.color,
    opacity: itemStyle?.opacity ?? 1,
    // With no `select.itemStyle` the only feedback a click would give is the
    // pie's offset, so non-pie series fall back to the emphasis lift.
    lift: declared || series.type === "pie" ? 1 : EMPHASIS_LIFT,
    scale: 1,
    scaleSize: 0,
    offset:
      series.type === "pie"
        ? (series.selectedOffset ?? PIE_SELECTED_OFFSET)
        : 0,
    itemStyle,
    label: series.select?.label,
  };
}

/**
 * Builds the per-item state lookup for one render pass, following ECharts:
 * the hovered element (and, with `emphasis.focus: "series"`, its whole series)
 * goes to `emphasis`; everything else inside `blurScope` goes to `blur`;
 * selected data stays in `select`.
 */
export function createItemStates(input: ItemStateInput): ItemStateResolver {
  const { series, hover, focusSeriesIndex, selected } = input;
  const hasHover = hover != null && series[hover.seriesIndex] != null;
  const hasFocus = focusSeriesIndex != null && series[focusSeriesIndex] != null;
  if (!hasHover && !hasFocus && selected.size === 0) return NO_ITEM_STATES;

  const fallbackIndexOf = new Map<object, number>(
    series.map((entry, index) => [entry as object, index] as const),
  );
  const indexOf = input.indexOf ?? fallbackIndexOf;
  const seriesIndexOf = (entry: SeriesOption): number =>
    indexOf.get(entry as object) ?? fallbackIndexOf.get(entry as object) ?? -1;

  // A legend item under the pointer (or under keyboard focus) highlights its
  // whole series, exactly like hovering one of its elements with
  // `focus: "series"` — unless the series opted out via legendHoverLink.
  const legendSource =
    hasFocus &&
    (series[focusSeriesIndex as number] as StatefulSeries).legendHoverLink !==
      false
      ? (focusSeriesIndex as number)
      : null;
  const sourceIndex = hasHover
    ? (hover as { seriesIndex: number }).seriesIndex
    : legendSource;
  const source =
    sourceIndex != null ? (series[sourceIndex] as StatefulSeries) : null;
  const emphasis = source?.emphasis;
  const active = source != null && emphasis?.disabled !== true;
  // The legend path highlights the series as a whole whatever `focus` says.
  const focus = !active
    ? "none"
    : legendSource != null && !hasHover
      ? "series"
      : (emphasis?.focus ?? "none");
  const blurScope = emphasis?.blurScope ?? "coordinateSystem";
  const sourceCoordinateSystem =
    source != null ? coordinateSystemOf(source) : "";
  const hoveredDataIndex = hasHover
    ? (hover as { dataIndex: number }).dataIndex
    : -1;

  const emphasised = active
    ? emphasisVisual(source as StatefulSeries, emphasis)
    : NORMAL_STATE;

  const inBlurScope = (
    candidate: StatefulSeries,
    candidateIndex: number,
  ): boolean => {
    if (!active || focus === "none") return false;
    if (blurScope === "global") return true;
    if (blurScope === "series") return candidateIndex === sourceIndex;
    return coordinateSystemOf(candidate) === sourceCoordinateSystem;
  };

  return (entry: SeriesOption, dataIndex: number): ItemStateVisual => {
    const candidate = entry as StatefulSeries;
    const seriesIndex = seriesIndexOf(entry);
    if (
      selected.size > 0 &&
      dataIndex >= 0 &&
      selected.has(selectionKey(seriesIndex, dataIndex))
    ) {
      return selectVisual(candidate);
    }
    if (active && seriesIndex === sourceIndex) {
      // focus "series" lifts the whole series; otherwise only the datum the
      // pointer is actually on. dataIndex -1 (the series as a whole) counts as
      // the target only under "series".
      if (focus === "series") return emphasised;
      if (dataIndex >= 0 && dataIndex === hoveredDataIndex) return emphasised;
      if (focus === "self" || focus === "adjacency")
        return inBlurScope(candidate, seriesIndex)
          ? blurVisual(candidate)
          : NORMAL_STATE;
      return NORMAL_STATE;
    }
    if (inBlurScope(candidate, seriesIndex)) return blurVisual(candidate);
    return NORMAL_STATE;
  };
}

function clampChannel(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Applies a state's visual delta to a colour the renderer already resolved.
 * `resolve` is the pass's ColorResolver, needed only when the state declares
 * its own `itemStyle.color` (which may be a theme family or a var(--…) ref).
 */
export function applyItemState(
  base: Rgba,
  visual: ItemStateVisual,
  resolve: ColorResolver,
  fallbackIndex: number,
): Rgba {
  if (visual === NORMAL_STATE) return base;
  const rgba =
    visual.color != null ? resolve.rgba(visual.color, fallbackIndex) : base;
  const lift = visual.lift;
  return [
    clampChannel(rgba[0] * lift),
    clampChannel(rgba[1] * lift),
    clampChannel(rgba[2] * lift),
    clampChannel(rgba[3] * visual.opacity),
  ];
}

// ─── Brush inBrush / outOfBrush ─────────────────────────────────────────────

// DERIVED, not a measured ECharts constant: dim the un-brushed points enough
// to read as "stepped back" without disappearing, the same visual intent as
// BLUR_OPACITY above (emphasis' blur state) — no ECharts source was read to
// confirm ECharts' own literal default, so this is a reasonable default, not
// a byte-exact port; override with `outOfBrush.opacity`.
const DEFAULT_OUT_OF_BRUSH_OPACITY = 0.3;

function brushVisual(
  config: { color?: unknown[]; opacity?: number } | undefined,
  defaultOpacity: number,
): ItemStateVisual {
  return {
    name: "select",
    color: config?.color?.[0],
    opacity: config?.opacity ?? defaultOpacity,
    lift: 1,
    scale: 1,
    scaleSize: 0,
    offset: 0,
  };
}

/**
 * Per-item visual state driven by a `brushSelected` selection, for the
 * series types brush hit-tests (bar/line/scatter/candlestick — see engine.ts's
 * mountBrush). Brushed-in data gets `inBrush` styling (default: no change),
 * everything else in a brushable series gets `outOfBrush` (default: dimmed).
 * A line's own stroke (`dataIndex: -1`) counts as "in" when ANY of its
 * points are selected — `brushedSeriesIndices` carries that aggregate so the
 * per-point loop below does not need to re-scan the whole selection.
 */
export function createBrushStates(input: {
  option: BrushOption | undefined;
  hasAreas: boolean;
  selectedKeys: ReadonlySet<string>;
  brushedSeriesIndices: ReadonlySet<number>;
  seriesIndexOf: (series: SeriesOption) => number;
}): ItemStateResolver {
  if (!input.hasAreas) return NO_ITEM_STATES;
  const inVisual = brushVisual(input.option?.inBrush, 1);
  const outVisual = brushVisual(
    input.option?.outOfBrush,
    DEFAULT_OUT_OF_BRUSH_OPACITY,
  );
  return (series, dataIndex) => {
    const seriesIndex = input.seriesIndexOf(series);
    const inSelection =
      dataIndex === -1
        ? input.brushedSeriesIndices.has(seriesIndex)
        : input.selectedKeys.has(selectionKey(seriesIndex, dataIndex));
    return inSelection ? inVisual : outVisual;
  };
}
