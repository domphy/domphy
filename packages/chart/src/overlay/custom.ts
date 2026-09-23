import { cssColor } from "../gl/color.js";
import type { AnyScale } from "../scale/index.js";
import type {
  ChartRect,
  CustomElement,
  CustomRenderParams,
  CustomSeriesAPI,
  CustomSeriesOption,
  ItemStyleOption,
} from "../types.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function pointsAttr(points: unknown): string {
  if (!Array.isArray(points)) return "";
  return points
    .map((p) => (Array.isArray(p) ? `${Number(p[0])},${Number(p[1])}` : ""))
    .join(" ");
}

// ECharts renderItem style objects use zrender's canvas-style property names
// (fill/stroke/lineWidth/opacity/…), not SVG attribute names — translate the
// ones this renderer supports.
function applyStyle(node: SVGElement, style: Record<string, unknown>): void {
  if (style.fill !== undefined) node.setAttribute("fill", String(style.fill));
  if (style.stroke !== undefined) {
    node.setAttribute("stroke", String(style.stroke));
  }
  if (style.lineWidth !== undefined) {
    node.setAttribute("stroke-width", String(style.lineWidth));
  }
  if (style.opacity !== undefined) {
    node.setAttribute("opacity", String(style.opacity));
  }
  if (style.fillOpacity !== undefined) {
    node.setAttribute("fill-opacity", String(style.fillOpacity));
  }
  if (style.strokeOpacity !== undefined) {
    node.setAttribute("stroke-opacity", String(style.strokeOpacity));
  }
  if (style.lineDash !== undefined) {
    const dash = Array.isArray(style.lineDash)
      ? style.lineDash.join(",")
      : String(style.lineDash);
    node.setAttribute("stroke-dasharray", dash);
  }
  if (style.fontSize !== undefined) {
    node.setAttribute("font-size", String(style.fontSize));
  }
  if (style.fontWeight !== undefined) {
    node.setAttribute("font-weight", String(style.fontWeight));
  }
  if (style.textAlign !== undefined) {
    const anchor =
      style.textAlign === "center"
        ? "middle"
        : style.textAlign === "right"
          ? "end"
          : "start";
    node.setAttribute("text-anchor", anchor);
  }
}

function itemStyleOf(item: unknown): ItemStyleOption | undefined {
  return typeof item === "object" && item !== null && !Array.isArray(item)
    ? (item as { itemStyle?: ItemStyleOption }).itemStyle
    : undefined;
}

// ECharts precedence: data item itemStyle.color > series color > palette.
function resolveStyle(
  s: CustomSeriesOption,
  item: unknown,
  seriesIndex: number,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const itemStyle = itemStyleOf(item);
  const result: Record<string, unknown> = {
    fill: cssColor(itemStyle?.color ?? s.color, seriesIndex),
  };
  if (itemStyle?.borderColor !== undefined) {
    result.stroke = cssColor(itemStyle.borderColor, seriesIndex);
  }
  if (itemStyle?.borderWidth !== undefined) {
    result.lineWidth = itemStyle.borderWidth;
  }
  if (itemStyle?.opacity !== undefined) result.opacity = itemStyle.opacity;
  return { ...result, ...extra };
}

// A data item is a plain array `[x, y, …]`, an object `{ value: […] }`, or —
// for dim 0 only — a bare scalar. Mirrors the same shapes every other
// overlay renderer (pictorialbar.ts, labels.ts) already accepts. Returns the
// RAW value (a category dimension is a string) — callers that need a number
// (coord()/size(), which are always positional x/y) coerce themselves;
// api.ordinalRawValue() and api.value() (typed to always return a number,
// matching ECharts' own CustomSeriesAPI.value signature) each coerce to
// what their own contract promises.
function rawDim(item: unknown, dim: number): unknown {
  const raw = Array.isArray(item)
    ? item
    : typeof item === "object" && item !== null
      ? (item as { value?: unknown }).value
      : item;
  if (Array.isArray(raw)) return raw[dim];
  return dim === 0 ? raw : undefined;
}

function dimValue(item: unknown, dim: number): number {
  return Number(rawDim(item, dim));
}

function encodeDim(
  encode: CustomSeriesOption["encode"],
  key: "x" | "y",
  fallback: number,
): number {
  const raw = encode?.[key];
  if (typeof raw === "number") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "number") return raw[0];
  return fallback;
}

// Recursively renders one ECharts renderItem graphic element description.
// Supported types cover the vast majority of real renderItem usage (Gantt/
// timeline bars, custom markers): group, rect, circle, polygon, polyline,
// line, text. sector/arc/bezierCurve/image/path (polar wedges, rounded
// vector icons) have no mapping here — out of scope for this pass.
function renderElement(parent: SVGElement, element: CustomElement): void {
  if (element.invisible || element.ignore) return;
  const shape = (element.shape ?? {}) as Record<string, unknown>;
  const style = (element.style ?? {}) as Record<string, unknown>;
  let node: SVGElement | null = null;

  switch (element.type) {
    case "group": {
      const g = document.createElementNS(SVG_NS, "g");
      for (const child of element.children ?? []) renderElement(g, child);
      node = g;
      break;
    }
    case "rect": {
      const r = Number(shape.r ?? 0);
      node = svgEl("rect", {
        x: Number(shape.x ?? 0),
        y: Number(shape.y ?? 0),
        width: Number(shape.width ?? 0),
        height: Number(shape.height ?? 0),
        ...(r ? { rx: r, ry: r } : {}),
      });
      applyStyle(node, style);
      break;
    }
    case "circle": {
      node = svgEl("circle", {
        cx: Number(shape.cx ?? 0),
        cy: Number(shape.cy ?? 0),
        r: Number(shape.r ?? 0),
      });
      applyStyle(node, style);
      break;
    }
    case "polygon": {
      node = svgEl("polygon", { points: pointsAttr(shape.points) });
      applyStyle(node, style);
      break;
    }
    case "polyline": {
      node = svgEl("polyline", { points: pointsAttr(shape.points) });
      applyStyle(node, { fill: "none", ...style });
      break;
    }
    case "line": {
      node = svgEl("line", {
        x1: Number(shape.x1 ?? 0),
        y1: Number(shape.y1 ?? 0),
        x2: Number(shape.x2 ?? 0),
        y2: Number(shape.y2 ?? 0),
      });
      applyStyle(node, style);
      break;
    }
    case "text": {
      const textEl = svgEl("text", {
        x: Number(shape.x ?? 0),
        y: Number(shape.y ?? 0),
      });
      if (style.text !== undefined) textEl.textContent = String(style.text);
      applyStyle(textEl, style);
      node = textEl;
      break;
    }
    default:
      return;
  }
  if (!node) return;

  const transform: string[] = [];
  if (element.x || element.y) {
    transform.push(`translate(${element.x ?? 0},${element.y ?? 0})`);
  }
  if (element.rotation) {
    transform.push(`rotate(${(element.rotation * 180) / Math.PI})`);
  }
  if (element.scaleX !== undefined || element.scaleY !== undefined) {
    transform.push(`scale(${element.scaleX ?? 1},${element.scaleY ?? 1})`);
  }
  if (transform.length > 0) node.setAttribute("transform", transform.join(" "));
  if (element.originX !== undefined || element.originY !== undefined) {
    node.setAttribute(
      "transform-origin",
      `${element.originX ?? 0}px ${element.originY ?? 0}px`,
    );
  }
  if (element.id !== undefined)
    node.setAttribute("data-id", String(element.id));

  parent.appendChild(node);

  // textContent is an attached label positioned relative to its host
  // element — offset it by the host's own translate so it lands correctly.
  if (element.textContent) {
    renderElement(parent, {
      ...element.textContent,
      x: (element.textContent.x ?? 0) + (element.x ?? 0),
      y: (element.textContent.y ?? 0) + (element.y ?? 0),
    });
  }
}

export function renderCustom(
  svg: SVGSVGElement,
  series: CustomSeriesOption[],
  xScales: AnyScale[],
  yScales: AnyScale[],
  gridRect: ChartRect,
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-custom");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "dc-custom");

  for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
    const s = series[seriesIndex];
    if (s.name && hiddenSeries.has(s.name)) continue;
    if (typeof s.renderItem !== "function") continue;

    const coordinateSystem = s.coordinateSystem ?? "cartesian2d";
    // polar/geo custom series need their own coordinate abstraction — this
    // renderer only speaks the cartesian2d scales every other overlay does.
    if (coordinateSystem !== "cartesian2d" && coordinateSystem !== "none") {
      continue;
    }

    const xScale = xScales[s.xAxisIndex ?? 0];
    const yScale = yScales[s.yAxisIndex ?? 0];
    const data = s.data ?? [];
    const xDim = encodeDim(s.encode, "x", 0);
    const yDim = encodeDim(s.encode, "y", 1);
    const seriesGroup = document.createElementNS(SVG_NS, "g");

    // ECharts calls renderItem() once per data item but hands every call
    // the SAME `context` object reference for the whole series render pass,
    // so a callback can accumulate state across items (e.g. a Gantt chart
    // tracking the previous bar's end position).
    const context: object = {};
    const coordSys =
      coordinateSystem === "cartesian2d"
        ? {
            type: "cartesian2d",
            x: gridRect.x,
            y: gridRect.y,
            width: gridRect.width,
            height: gridRect.height,
          }
        : { type: "none" };

    const coord = (value: number[]): [number, number] => {
      if (coordinateSystem === "none" || !xScale || !yScale) {
        return [Number(value[0]) || 0, Number(value[1]) || 0];
      }
      return [xScale.map(value[0]), yScale.map(value[1])];
    };

    for (let dataIndex = 0; dataIndex < data.length; dataIndex++) {
      const item = data[dataIndex];
      const currentPoint = (): number[] => [
        dimValue(item, xDim),
        dimValue(item, yDim),
      ];

      const api: CustomSeriesAPI = {
        value: (dim, dataIndexInside) => {
          const index = typeof dim === "number" ? dim : xDim;
          const target =
            dataIndexInside === undefined ? item : data[dataIndexInside];
          return dimValue(target, index);
        },
        ordinalRawValue: (dim, dataIndexInside) => {
          const index = typeof dim === "number" ? dim : xDim;
          const target =
            dataIndexInside === undefined ? item : data[dataIndexInside];
          const raw = rawDim(target, index);
          const scale =
            index === xDim ? xScale : index === yDim ? yScale : undefined;
          if (scale?.type === "ordinal") {
            const asIndex = Math.round(Number(raw));
            return scale.domain[asIndex] ?? (raw as string | number);
          }
          return raw as string | number;
        },
        coord: (value) => coord(value),
        // The pixel-space MAGNITUDE of a data-space extent — ECharts' own
        // "Gantt chart" reference example (api.size([0,1])[1] * ratio, fed
        // straight into a rect's height) only renders correctly if this is
        // never negative. Tries the FORWARD delta (coord(base+dataSize) -
        // coord(base)) first; a category scale's map() clamps an out-of-
        // domain index to the last band, so the forward delta degenerates
        // to 0 for the last category (and the backward one for the first) —
        // fall back to the BACKWARD delta (coord(base) - coord(base-
        // dataSize)) in that case, which is the same band pitch measured
        // from the other side and does not hit the clamp.
        size: (dataSize, dataItem) => {
          const base = dataItem ?? currentPoint();
          const p0 = coord(base);
          const forward = coord([base[0] + dataSize[0], base[1] + dataSize[1]]);
          const backward = coord([
            base[0] - dataSize[0],
            base[1] - dataSize[1],
          ]);
          const pick = (fwd: number, bwd: number, p0v: number) =>
            fwd !== p0v ? Math.abs(fwd - p0v) : Math.abs(p0v - bwd);
          return [
            pick(forward[0], backward[0], p0[0]),
            pick(forward[1], backward[1], p0[1]),
          ];
        },
        style: (extra, dataIndexInside) =>
          resolveStyle(
            s,
            dataIndexInside === undefined ? item : data[dataIndexInside],
            seriesIndex,
            extra as Record<string, unknown> | undefined,
          ),
        styleEmphasis: (extra, dataIndexInside) =>
          resolveStyle(
            s,
            dataIndexInside === undefined ? item : data[dataIndexInside],
            seriesIndex,
            {
              ...(s.emphasis?.itemStyle as Record<string, unknown> | undefined),
              ...(extra as Record<string, unknown> | undefined),
            },
          ),
        visual: (visualType, dataIndexInside) => {
          const target =
            dataIndexInside === undefined ? item : data[dataIndexInside];
          const itemStyle = itemStyleOf(target);
          if (visualType === "color") {
            return cssColor(itemStyle?.color ?? s.color, seriesIndex);
          }
          if (visualType === "opacity") return itemStyle?.opacity ?? 1;
          return undefined;
        },
        currentSeriesIndices: () => [seriesIndex],
        font: (opt) => {
          const o = (opt ?? {}) as Record<string, unknown>;
          const weight = o.fontWeight ?? "normal";
          const size = o.fontSize ?? 12;
          const family = o.fontFamily ?? "sans-serif";
          return `${weight} ${size}px ${family}`;
        },
        getWidth: () => width,
        getHeight: () => height,
        getZr: () => ({}) as object,
        getDevicePixelRatio: () =>
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      };

      const params: CustomRenderParams = {
        context,
        seriesId: s.id ?? "",
        seriesName: s.name ?? "",
        seriesIndex,
        coordSys: coordSys as CustomRenderParams["coordSys"],
        dataIndexInside: dataIndex,
        dataIndex,
      };

      let element: CustomElement | null | undefined;
      try {
        element = s.renderItem(params, api);
      } catch (error) {
        // A user renderItem callback throwing must not blank the whole
        // chart — same "isolate the offending series" contract tooltip.ts
        // and the other overlay renderers already follow.
        if (typeof console !== "undefined") {
          console.error("@domphy/chart: series.renderItem threw", error);
        }
        continue;
      }
      if (element) renderElement(seriesGroup, element);
    }

    group.appendChild(seriesGroup);
  }

  svg.appendChild(group);
}
