import { seriesHex } from "../gl/color.js";
import type { GeoOption, LinesSeriesOption } from "../types.js";
import { getRegisteredMap } from "./geomap.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number | boolean>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function mercatorProject(lng: number, lat: number): [number, number] {
  const x = (lng + 180) / 360;
  const latRad = (lat * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return [x, y];
}

interface GeoViewport {
  left: number;
  top: number;
  w: number;
  h: number;
  minX: number;
  minY: number;
  scaleX: number;
  scaleY: number;
}

function buildViewport(
  geo: GeoOption,
  geoJSON: any,
  width: number,
  height: number,
): GeoViewport | null {
  const left = typeof geo.left === "number" ? geo.left : width * 0.05;
  const top = typeof geo.top === "number" ? geo.top : height * 0.05;
  const right = typeof geo.right === "number" ? geo.right : width * 0.05;
  const bottom = typeof geo.bottom === "number" ? geo.bottom : height * 0.05;
  const w = width - left - right;
  const h = height - top - bottom;

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  function walk(coords: any, depth: number): void {
    if (!Array.isArray(coords)) return;
    if (depth === 0 || (depth === 1 && typeof coords[0] === "number")) {
      const [lng, lat] = coords as [number, number];
      const [px, py] = mercatorProject(lng, lat);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    } else {
      for (const c of coords) walk(c, depth - 1);
    }
  }

  for (const feature of geoJSON?.features ?? []) {
    const geom = feature?.geometry;
    if (!geom) continue;
    const depth =
      geom.type === "Polygon"
        ? 2
        : geom.type === "MultiPolygon"
          ? 3
          : geom.type === "LineString"
            ? 1
            : geom.type === "MultiLineString"
              ? 2
              : 0;
    if (depth > 0) walk(geom.coordinates, depth);
  }

  if (!isFinite(minX)) return null;

  const zoom = geo.zoom ?? 1;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = Math.min(w / spanX, h / spanY) * zoom;

  return { left, top, w, h, minX, minY, scaleX: scale, scaleY: scale };
}

function lngLatToPixel(
  lng: number,
  lat: number,
  vp: GeoViewport,
): [number, number] {
  const [nx, ny] = mercatorProject(lng, lat);
  const px =
    vp.left +
    (nx - vp.minX) * vp.scaleX +
    (vp.w - vp.scaleX * /* spanX approx */ 1) / 2;
  const py = vp.top + (ny - vp.minY) * vp.scaleY + (vp.h - vp.scaleY * 1) / 2;
  return [px, py];
}

// Better: use same logic as geomap viewport — compute centroid offset
function lngLatToPixelVp(
  lng: number,
  lat: number,
  vp: GeoViewport,
  centerOffsetX: number,
  centerOffsetY: number,
): [number, number] {
  const [nx, ny] = mercatorProject(lng, lat);
  return [
    vp.left + (nx - vp.minX) * vp.scaleX + centerOffsetX,
    vp.top + (ny - vp.minY) * vp.scaleY + centerOffsetY,
  ];
}

function ensureStyle(svg: SVGSVGElement): void {
  if (svg.querySelector("style[data-lines]")) return;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.setAttribute("data-lines", "1");
  style.textContent = `
@keyframes dc-trail { 0%{stroke-dashoffset:1000} 100%{stroke-dashoffset:0} }
@keyframes dc-dot { 0%{offset-distance:0%} 100%{offset-distance:100%} }
.dc-lines-trail { animation: dc-trail 2s linear infinite; }
.dc-lines-dot { animation: dc-dot 2s linear infinite; }
`;
  svg.insertBefore(style, svg.firstChild);
}

export function renderLines(
  svg: SVGSVGElement,
  geos: GeoOption[],
  linesSeries: LinesSeriesOption[],
  width: number,
  height: number,
): void {
  const old = svg.querySelector(".dc-lines");
  if (old) old.remove();
  if (linesSeries.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-lines");

  const geo = geos[0];
  const geoName =
    (geo?.map ?? linesSeries[0]?.geoIndex !== undefined) ? "" : "";
  const mapName = geo?.map ?? "world";
  const geoJSON = getRegisteredMap(mapName);
  const vp = geoJSON
    ? buildViewport(geo ?? { map: mapName }, geoJSON, width, height)
    : null;

  // Compute center offset as geomap.ts does
  let centerOffsetX = 0,
    centerOffsetY = 0;
  if (vp && geoJSON) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const f of geoJSON.features ?? []) {
      const geom = f?.geometry;
      if (!geom) continue;
      function walkCoords(c: any, d: number): void {
        if (!Array.isArray(c)) return;
        if (d === 0 || (d === 1 && typeof c[0] === "number")) {
          const [px, py] = mercatorProject(c[0], c[1]);
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        } else {
          for (const x of c) walkCoords(x, d - 1);
        }
      }
      const depth =
        geom.type === "Polygon"
          ? 2
          : geom.type === "MultiPolygon"
            ? 3
            : geom.type === "LineString"
              ? 1
              : geom.type === "MultiLineString"
                ? 2
                : 0;
      if (depth > 0) walkCoords(geom.coordinates, depth);
    }
    if (isFinite(minX)) {
      const spanX = maxX - minX || 1;
      const spanY = maxY - minY || 1;
      centerOffsetX = (vp.w - spanX * vp.scaleX) / 2;
      centerOffsetY = (vp.h - spanY * vp.scaleY) / 2;
    }
  }

  const hasEffect = linesSeries.some((s) => s.effect?.show);
  if (hasEffect) ensureStyle(svg);

  for (let si = 0; si < linesSeries.length; si++) {
    const s = linesSeries[si];
    const baseColor = s.color ? `var(--dc-${s.color})` : seriesHex(si);
    const lineWidth = s.lineStyle?.width ?? 1;
    const opacity = s.lineStyle?.opacity ?? 0.6;
    const showEffect = s.effect?.show ?? false;
    const effectSize = s.effect?.symbolSize ?? 5;
    const effectColor = s.effect?.color ?? baseColor;

    for (const item of s.data ?? []) {
      const [from, to] = item.coords;
      let x1: number, y1: number, x2: number, y2: number;

      if (s.coordinateSystem === "geo" || !s.coordinateSystem) {
        if (!vp) continue;
        [x1, y1] = lngLatToPixelVp(
          from[0],
          from[1],
          vp,
          centerOffsetX,
          centerOffsetY,
        );
        [x2, y2] = lngLatToPixelVp(
          to[0],
          to[1],
          vp,
          centerOffsetX,
          centerOffsetY,
        );
      } else {
        // cartesian2d — coordinates are pixel positions directly
        [x1, y1] = [from[0], from[1]];
        [x2, y2] = [to[0], to[1]];
      }

      // Cubic bezier: control points arc upward
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const arcHeight = dist * 0.3;
      const dx = y2 - y1,
        dy = -(x2 - x1);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const cpX = midX + (dx / len) * arcHeight;
      const cpY = midY + (dy / len) * arcHeight;

      const pathId = `dc-lines-path-${si}-${Math.random().toString(36).slice(2, 8)}`;
      const d = `M${x1},${y1} Q${cpX},${cpY} ${x2},${y2}`;

      const path = svgEl("path", {
        id: pathId,
        d,
        fill: "none",
        stroke: baseColor,
        "stroke-width": lineWidth,
        opacity,
      });
      group.appendChild(path);

      if (showEffect) {
        // Animated dot along the path
        const dot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle",
        );
        dot.setAttribute("r", String(effectSize / 2));
        dot.setAttribute("fill", effectColor);
        dot.setAttribute("opacity", "0.9");
        const motion = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "animateMotion",
        );
        motion.setAttribute("dur", `${s.effect?.period ?? 2}s`);
        motion.setAttribute("repeatCount", "indefinite");
        const mpath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "mpath",
        );
        mpath.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "href",
          `#${pathId}`,
        );
        motion.appendChild(mpath);
        dot.appendChild(motion);
        group.appendChild(dot);
      }
    }
  }

  svg.appendChild(group);
}
