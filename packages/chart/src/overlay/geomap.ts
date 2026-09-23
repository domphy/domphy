import { themeColor } from "@domphy/theme";
import { cssColor, seriesColor } from "../gl/color.js";
import type {
  GeoItemStyleOption,
  GeoOption,
  MapSeriesOption,
  ScatterSeriesOption,
  VisualMapOption,
} from "../types.js";
import { colorFromVisualMap } from "./visualmap.js";

// Default region paint. ECharts' built-in geo itemStyle is a flat light grey
// (#eee area, #444 border); the theme neutral ramp is this repo's equivalent
// and, unlike a literal hex, follows [data-theme] at paint time — the hard-
// coded "#e0e0e0"/"#999"/"#333" this replaced were invisible on a dark theme.
const DEFAULT_AREA_TONE = "shift-3";
const DEFAULT_BORDER_TONE = "shift-6";
const DEFAULT_LABEL_TONE = "shift-10";
const DEFAULT_BORDER_WIDTH = 0.5;
const DEFAULT_AREA_OPACITY = 0.9;

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// Global map registry
const MAP_REGISTRY = new Map<string, any>();

export function registerMap(name: string, geoJSON: object): void {
  MAP_REGISTRY.set(name, geoJSON);
}

export function getRegisteredMap(name: string): any {
  return MAP_REGISTRY.get(name);
}

// ─── Roam (pan + wheel zoom) ─────────────────────────────────────────────────

// Every geo-projected layer shares one pixel space (all three project through
// the same mercator viewport), so roam is one SVG transform applied to each —
// no re-projection, no re-render.
const GEO_LAYER_SELECTORS = [".dc-geomap", ".dc-lines", ".dc-effect-scatter"];

interface RoamState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface RoamConfig {
  allowMove: boolean;
  allowScale: boolean;
  scaleLimit: { min?: number; max?: number } | undefined;
}

const roamStates = new WeakMap<SVGSVGElement, RoamState>();
// The listeners are bound once per SVG but every render brings a fresh option,
// so they read the config through this map instead of closing over the values
// of the render that happened to bind them.
const roamConfigs = new WeakMap<SVGSVGElement, RoamConfig>();
const roamBound = new WeakSet<SVGSVGElement>();

/**
 * Re-applies the current roam transform to every geo layer of `svg`.
 * Layers are rebuilt on each render, so each renderer calls this after it
 * appends its group (the transform would otherwise be lost).
 */
export function applyGeoRoamTransform(svg: SVGSVGElement): void {
  const state = roamStates.get(svg);
  for (const selector of GEO_LAYER_SELECTORS) {
    const layer = svg.querySelector(selector);
    if (!layer) continue;
    if (!state) {
      layer.removeAttribute("transform");
      continue;
    }
    layer.setAttribute(
      "transform",
      `translate(${state.translateX},${state.translateY}) scale(${state.scale})`,
    );
  }
}

// ECharts' RoamController scales by a fixed factor per wheel notch; 1.1 is the
// factor its `mousewheel` handler uses (scale = 1 + 0.1 up, 1 / (1 + 0.1) down).
const ZOOM_FACTOR_PER_WHEEL_NOTCH = 1.1;

function bindRoam(svg: SVGSVGElement, config: RoamConfig): void {
  roamConfigs.set(svg, config);
  if (roamBound.has(svg)) return;
  roamBound.add(svg);

  const stateOf = (): RoamState => {
    let state = roamStates.get(svg);
    if (!state) {
      state = { scale: 1, translateX: 0, translateY: 0 };
      roamStates.set(svg, state);
    }
    return state;
  };

  const overGeo = (e: Event): boolean =>
    e.target instanceof Element && e.target.closest(".dc-geomap") !== null;

  svg.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      const scaleLimit = roamConfigs.get(svg)?.scaleLimit;
      if (!roamConfigs.get(svg)?.allowScale || !overGeo(e)) return;
      e.preventDefault();
      const state = stateOf();
      const factor =
        e.deltaY < 0
          ? ZOOM_FACTOR_PER_WHEEL_NOTCH
          : 1 / ZOOM_FACTOR_PER_WHEEL_NOTCH;
      let next = state.scale * factor;
      if (scaleLimit?.min != null) next = Math.max(scaleLimit.min, next);
      if (scaleLimit?.max != null) next = Math.min(scaleLimit.max, next);
      if (next === state.scale) return;
      // Keep the point under the cursor fixed:
      //   pointer = translate + scale * local  ⇒  translate' = p - (p - t) * (s'/s)
      const rect = svg.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const ratio = next / state.scale;
      state.translateX = pointerX - (pointerX - state.translateX) * ratio;
      state.translateY = pointerY - (pointerY - state.translateY) * ratio;
      state.scale = next;
      applyGeoRoamTransform(svg);
    },
    { passive: false },
  );

  svg.addEventListener("pointerdown", (e: PointerEvent) => {
    if (!roamConfigs.get(svg)?.allowMove || !overGeo(e)) return;
    const state = stateOf();
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = state.translateX;
    const originY = state.translateY;

    // The pointer leaves the (pointer-events:none) SVG as soon as it moves off
    // a painted region, so the drag has to be tracked on the window.
    const onMove = (move: PointerEvent) => {
      state.translateX = originX + (move.clientX - startX);
      state.translateY = originY + (move.clientY - startY);
      applyGeoRoamTransform(svg);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });
}

// ─── Region paint ────────────────────────────────────────────────────────────

/** ECharts precedence: data item > `geo.regions` entry > component/series default. */
function resolveRegionStyle(
  ...styles: (GeoItemStyleOption | undefined)[]
): Required<Pick<GeoItemStyleOption, "borderWidth" | "opacity">> & {
  areaColor: string | undefined;
  borderColor: string;
} {
  let areaColor: string | undefined;
  let borderColor: string | undefined;
  let borderWidth: number | undefined;
  let opacity: number | undefined;
  for (const style of styles) {
    if (!style) continue;
    if (style.areaColor != null) areaColor = cssColor(style.areaColor, 0);
    if (style.borderColor != null) borderColor = cssColor(style.borderColor, 0);
    if (style.borderWidth != null) borderWidth = style.borderWidth;
    if (style.opacity != null) opacity = style.opacity;
  }
  return {
    areaColor,
    borderColor:
      borderColor ?? themeColor(null, DEFAULT_BORDER_TONE, "neutral"),
    borderWidth: borderWidth ?? DEFAULT_BORDER_WIDTH,
    opacity: opacity ?? DEFAULT_AREA_OPACITY,
  };
}

// Mercator projection: lng/lat → [0,1] normalized
function mercatorProject(lng: number, lat: number): [number, number] {
  const x = (lng + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return [x, y];
}

interface GeoViewport {
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  minY: number;
  scaleX: number;
  scaleY: number;
  zoom: number;
  center: [number, number];
}

function buildViewport(
  geo: GeoOption,
  geoJSON: any,
  width: number,
  height: number,
): GeoViewport {
  const left =
    typeof geo.left === "number"
      ? geo.left
      : typeof geo.left === "string"
        ? parseFloat(geo.left)
        : width * 0.05;
  const top =
    typeof geo.top === "number"
      ? geo.top
      : typeof geo.top === "string"
        ? parseFloat(geo.top)
        : height * 0.05;
  const right =
    typeof geo.right === "number"
      ? geo.right
      : typeof geo.right === "string"
        ? parseFloat(geo.right)
        : width * 0.05;
  const bottom =
    typeof geo.bottom === "number"
      ? geo.bottom
      : typeof geo.bottom === "string"
        ? parseFloat(geo.bottom)
        : height * 0.05;

  const w = width - left - right;
  const h = height - top - bottom;

  // Compute bounding box from GeoJSON
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  function processCoords(coords: any, depth = 0): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number") {
      const [px, py] = mercatorProject(coords[0], coords[1]);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    } else {
      for (const child of coords) processCoords(child, depth + 1);
    }
  }

  const features = geoJSON?.features ?? [];
  for (const feature of features) {
    processCoords(feature?.geometry?.coordinates);
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 1;
    minY = 0;
    maxY = 1;
  }

  const dataW = maxX - minX || 1;
  const dataH = maxY - minY || 1;

  const zoom = geo.zoom ?? 1;
  const scaleX = (w / dataW) * zoom;
  const scaleY = (h / dataH) * zoom;
  const scale = Math.min(scaleX, scaleY);

  const drawW = dataW * scale;
  const drawH = dataH * scale;
  const offsetX = left + (w - drawW) / 2;
  const offsetY = top + (h - drawH) / 2;

  return {
    x: offsetX,
    y: offsetY,
    w: drawW,
    h: drawH,
    minX,
    minY,
    scaleX: scale,
    scaleY: scale,
    zoom,
    center: geo.center ?? [0, 0],
  };
}

function projectToPixel(
  lng: number,
  lat: number,
  vp: GeoViewport,
): [number, number] {
  const [nx, ny] = mercatorProject(lng, lat);
  const x = vp.x + (nx - vp.minX) * vp.scaleX;
  const y = vp.y + (ny - vp.minY) * vp.scaleY;
  return [x, y];
}

function coordsToPath(coords: any, vp: GeoViewport): string {
  if (!Array.isArray(coords) || coords.length === 0) return "";

  // Polygon ring or MultiPolygon
  if (typeof coords[0][0] === "number") {
    // Linear ring
    return `${coords
      .map((c: number[], i: number) => {
        const [px, py] = projectToPixel(c[0], c[1], vp);
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ")} Z`;
  }

  // Multi-ring
  return coords.map((ring: any) => coordsToPath(ring, vp)).join(" ");
}

function featureToPath(geometry: any, vp: GeoViewport): string {
  if (!geometry) return "";
  const type = geometry.type;
  const coords = geometry.coordinates;

  if (type === "Polygon") {
    return coordsToPath(coords, vp);
  }
  if (type === "MultiPolygon") {
    return coords.map((poly: any) => coordsToPath(poly, vp)).join(" ");
  }
  if (type === "LineString") {
    return (coords as number[][])
      .map((c, i) => {
        const [px, py] = projectToPixel(c[0], c[1], vp);
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");
  }
  if (type === "MultiLineString") {
    return (coords as number[][][])
      .map((line) =>
        line
          .map((c, i) => {
            const [px, py] = projectToPixel(c[0], c[1], vp);
            return `${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`;
          })
          .join(" "),
      )
      .join(" ");
  }
  return "";
}

export function renderGeoMap(
  svg: SVGSVGElement,
  geos: GeoOption[],
  mapSeries: MapSeriesOption[],
  scatterSeries: ScatterSeriesOption[],
  visualMaps: VisualMapOption[],
  width: number,
  height: number,
): void {
  const old = svg.querySelector(".dc-geomap");
  if (old) old.remove();

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-geomap");

  // Process each geo coordinate system. A bare `map` series carries the same
  // geo configuration inline (ECharts: the series builds an implicit geo
  // component from its own roam/zoom/center/itemStyle/label).
  const geoList =
    geos.length > 0
      ? geos
      : mapSeries.map(
          (s): GeoOption => ({
            map: s.map,
            roam: s.roam,
            scaleLimit: s.scaleLimit,
            center: s.center,
            zoom: s.zoom,
            itemStyle: s.itemStyle,
            label: s.label,
          }),
        );

  const roamSource =
    geoList.find((entry) => entry.roam != null && entry.roam !== false) ?? null;
  if (roamSource) {
    const roam = roamSource.roam;
    bindRoam(svg, {
      allowMove: roam === true || roam === "move",
      allowScale: roam === true || roam === "scale",
      scaleLimit: roamSource.scaleLimit,
    });
    group.style.pointerEvents = "all";
    // ECharts roams anywhere in the geo rect, not only over a painted region.
    // Pointer events only hit painted geometry, so a transparent capture rect
    // goes underneath everything the group draws (it is appended first).
    group.appendChild(
      svgEl("rect", {
        x: 0,
        y: 0,
        width,
        height,
        fill: "transparent",
        "pointer-events": "all",
      }),
    );
  } else {
    // Roam turned off: drop the pan/zoom the user had applied, or the map
    // would stay stuck at the last transform with no way to move it back.
    roamConfigs.delete(svg);
    roamStates.delete(svg);
  }

  for (let gi = 0; gi < geoList.length; gi++) {
    const geo = geoList[gi];
    const mapName = geo.map ?? mapSeries[0]?.map ?? "";
    const geoJSON = MAP_REGISTRY.get(mapName);
    if (!geoJSON) continue;

    const vp = buildViewport(geo, geoJSON, width, height);

    // Build value map from map series
    const valueMap = new Map<string, number>();
    const itemStyleByName = new Map<string, GeoItemStyleOption>();
    for (const ms of mapSeries) {
      if ((ms.geoIndex ?? 0) !== gi && geos.length > 0) continue;
      for (const item of ms.data ?? []) {
        if (!item.name) continue;
        if (item.value !== undefined) valueMap.set(item.name, item.value);
        if (item.itemStyle) itemStyleByName.set(item.name, item.itemStyle);
      }
    }
    const regionStyleByName = new Map<string, GeoItemStyleOption>();
    for (const region of geo.regions ?? []) {
      if (region.itemStyle)
        regionStyleByName.set(region.name, region.itemStyle);
    }
    // A `map` series' own itemStyle applies to the geo it renders into.
    const seriesItemStyle = mapSeries.find(
      (ms) => ((ms.geoIndex ?? 0) === gi || geos.length === 0) && ms.itemStyle,
    )?.itemStyle;

    const vm = visualMaps[0];
    const features = geoJSON?.features ?? [];

    for (let fi = 0; fi < features.length; fi++) {
      const feature = features[fi];
      const props = feature?.properties ?? {};
      const name =
        props.name ?? props.NAME ?? props.NAME_1 ?? props.id ?? String(fi);
      const d = featureToPath(feature?.geometry, vp);
      if (!d) continue;

      const value = valueMap.get(name);
      const style = resolveRegionStyle(
        geo.itemStyle,
        seriesItemStyle,
        regionStyleByName.get(name),
        itemStyleByName.get(name),
      );
      // ECharts paints a valued region from the visualMap first; an explicit
      // itemStyle.areaColor is the next source, and the neutral surface tone
      // is the fallback for regions with no data at all.
      let fill: string;
      if (value !== undefined && vm) {
        fill = colorFromVisualMap(vm, value);
      } else if (style.areaColor !== undefined) {
        fill = style.areaColor;
      } else if (value !== undefined) {
        fill = seriesColor(Math.floor(value));
      } else {
        fill = themeColor(null, DEFAULT_AREA_TONE, "neutral");
      }

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", d);
      path.setAttribute("fill", fill);
      path.setAttribute("stroke", style.borderColor);
      path.setAttribute("stroke-width", String(style.borderWidth));
      path.setAttribute("opacity", String(style.opacity));
      group.appendChild(path);

      // Region label at centroid (simple average). An explicit `label.show`
      // wins in both directions — a map series asking for `show: false` used
      // to get a label anyway on every region that carried a value.
      const labelOption = geo.label;
      if (labelOption?.show ?? value !== undefined) {
        // Approximate centroid from path bounding box
        const coords = feature?.geometry?.coordinates;
        if (coords) {
          let sumX = 0,
            sumY = 0,
            count = 0;
          function collectPoints(c: any): void {
            if (!Array.isArray(c)) return;
            if (typeof c[0] === "number") {
              const [px, py] = projectToPixel(c[0], c[1], vp);
              sumX += px;
              sumY += py;
              count++;
            } else {
              for (const child of c) collectPoints(child);
            }
          }
          collectPoints(coords);
          if (count > 0) {
            const label = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text",
            );
            const formatter = labelOption?.formatter;
            label.textContent =
              typeof formatter === "function"
                ? formatter({
                    name,
                    value,
                    dataIndex: fi,
                    seriesIndex: 0,
                    seriesName: mapSeries[0]?.name ?? "",
                  })
                : typeof formatter === "string"
                  ? formatter
                      .replace(/\{b\}/g, name)
                      .replace(
                        /\{c\}/g,
                        value === undefined ? "" : String(value),
                      )
                  : value !== undefined
                    ? `${name}: ${value}`
                    : name;
            label.setAttribute("x", String(sumX / count));
            label.setAttribute("y", String(sumY / count));
            label.setAttribute("font-size", String(labelOption?.fontSize ?? 9));
            label.setAttribute(
              "fill",
              labelOption?.color != null
                ? cssColor(labelOption.color, 0)
                : themeColor(null, DEFAULT_LABEL_TONE, "neutral"),
            );
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.setAttribute("pointer-events", "none");
            group.appendChild(label);
          }
        }
      }
    }

    // Scatter series with coordinateSystem: "geo"
    for (let si = 0; si < scatterSeries.length; si++) {
      const sc = scatterSeries[si];
      if (sc.coordinateSystem !== "geo") continue;
      if ((sc.geoIndex ?? 0) !== gi) continue;

      const color = seriesColor(si);
      const size = typeof sc.symbolSize === "number" ? sc.symbolSize : 6;
      const data = sc.data ?? [];

      for (const item of data) {
        let lng: number, lat: number;
        if (Array.isArray(item)) {
          lng = item[0] as number;
          lat = item[1] as number;
        } else if (item && typeof item === "object" && "value" in item) {
          const v = (item as any).value;
          lng = Array.isArray(v) ? v[0] : 0;
          lat = Array.isArray(v) ? v[1] : 0;
        } else continue;

        const [px, py] = projectToPixel(lng, lat, vp);
        const circle = svgEl("circle", {
          cx: px,
          cy: py,
          r: size / 2,
          fill: color,
          opacity: 0.8,
        });
        group.appendChild(circle);
      }
    }
  }

  svg.appendChild(group);
  applyGeoRoamTransform(svg);
}
