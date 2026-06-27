import type { GeoOption, MapSeriesOption, ScatterSeriesOption, VisualMapOption } from "../types.js";
import { seriesHex } from "../gl/color.js";
import { colorFromVisualMap } from "./visualmap.js";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
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

// Mercator projection: lng/lat → [0,1] normalized
function mercatorProject(lng: number, lat: number): [number, number] {
  const x = (lng + 180) / 360;
  const latRad = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
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
  const left = typeof geo.left === "number" ? geo.left : typeof geo.left === "string" ? parseFloat(geo.left) : width * 0.05;
  const top = typeof geo.top === "number" ? geo.top : typeof geo.top === "string" ? parseFloat(geo.top) : height * 0.05;
  const right = typeof geo.right === "number" ? geo.right : typeof geo.right === "string" ? parseFloat(geo.right) : width * 0.05;
  const bottom = typeof geo.bottom === "number" ? geo.bottom : typeof geo.bottom === "string" ? parseFloat(geo.bottom) : height * 0.05;

  const w = width - left - right;
  const h = height - top - bottom;

  // Compute bounding box from GeoJSON
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

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

  if (!isFinite(minX)) { minX = 0; maxX = 1; minY = 0; maxY = 1; }

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
    x: offsetX, y: offsetY, w: drawW, h: drawH,
    minX, minY, scaleX: scale, scaleY: scale,
    zoom, center: geo.center ?? [0, 0],
  };
}

function projectToPixel(lng: number, lat: number, vp: GeoViewport): [number, number] {
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
    return coords.map((c: number[], i: number) => {
      const [px, py] = projectToPixel(c[0], c[1], vp);
      return `${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`;
    }).join(" ") + " Z";
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
    return (coords as number[][]).map((c, i) => {
      const [px, py] = projectToPixel(c[0], c[1], vp);
      return `${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`;
    }).join(" ");
  }
  if (type === "MultiLineString") {
    return (coords as number[][][]).map((line) =>
      line.map((c, i) => {
        const [px, py] = projectToPixel(c[0], c[1], vp);
        return `${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`;
      }).join(" ")
    ).join(" ");
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

  // Process each geo coordinate system
  const geoList = geos.length > 0 ? geos : mapSeries.map((s) => ({ map: s.map } as GeoOption));

  for (let gi = 0; gi < geoList.length; gi++) {
    const geo = geoList[gi];
    const mapName = geo.map ?? mapSeries[0]?.map ?? "";
    const geoJSON = MAP_REGISTRY.get(mapName);
    if (!geoJSON) continue;

    const vp = buildViewport(geo, geoJSON, width, height);

    // Build value map from map series
    const valueMap = new Map<string, number>();
    for (const ms of mapSeries) {
      if ((ms.geoIndex ?? 0) !== gi && geos.length > 0) continue;
      for (const item of ms.data ?? []) {
        if (item.name && item.value !== undefined) {
          valueMap.set(item.name, item.value);
        }
      }
    }

    const vm = visualMaps[0];
    const features = geoJSON?.features ?? [];

    for (let fi = 0; fi < features.length; fi++) {
      const feature = features[fi];
      const props = feature?.properties ?? {};
      const name = props.name ?? props.NAME ?? props.NAME_1 ?? props.id ?? String(fi);
      const d = featureToPath(feature?.geometry, vp);
      if (!d) continue;

      const value = valueMap.get(name);
      let fill = "#e0e0e0";
      if (value !== undefined && vm) {
        fill = colorFromVisualMap(vm, value);
      } else if (value !== undefined) {
        fill = seriesHex(Math.floor(value));
      }

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", fill);
      path.setAttribute("stroke", "#999");
      path.setAttribute("stroke-width", "0.5");
      path.setAttribute("opacity", "0.9");
      group.appendChild(path);

      // Region label at centroid (simple average)
      if (value !== undefined || geo.label?.show) {
        // Approximate centroid from path bounding box
        const coords = feature?.geometry?.coordinates;
        if (coords) {
          let sumX = 0, sumY = 0, count = 0;
          function collectPoints(c: any): void {
            if (!Array.isArray(c)) return;
            if (typeof c[0] === "number") {
              const [px, py] = projectToPixel(c[0], c[1], vp);
              sumX += px; sumY += py; count++;
            } else {
              for (const child of c) collectPoints(child);
            }
          }
          collectPoints(coords);
          if (count > 0) {
            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.textContent = value !== undefined ? `${name}: ${value}` : name;
            label.setAttribute("x", String(sumX / count));
            label.setAttribute("y", String(sumY / count));
            label.setAttribute("font-size", "9");
            label.setAttribute("fill", "#333");
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

      const color = seriesHex(si);
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
          cx: px, cy: py, r: size / 2,
          fill: color, opacity: 0.8,
        });
        group.appendChild(circle);
      }
    }
  }

  svg.appendChild(group);
}
