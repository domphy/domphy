import type { EffectScatterSeriesOption, GeoOption } from "../types.js";
import { seriesHex } from "../gl/color.js";
import { getRegisteredMap } from "./geomap.js";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function mercatorProject(lng: number, lat: number): [number, number] {
  const x = (lng + 180) / 360;
  const latRad = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2;
  return [x, y];
}

// Inject CSS animation once per SVG
function ensureRippleStyle(svg: SVGSVGElement): void {
  if (svg.querySelector("style[data-effect-scatter]")) return;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.setAttribute("data-effect-scatter", "1");
  style.textContent = `
@keyframes dc-ripple {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(var(--dc-ripple-scale, 3)); opacity: 0; }
}
.dc-ripple { transform-box: fill-box; transform-origin: center; animation: dc-ripple var(--dc-ripple-period, 2s) ease-out infinite; }
`;
  svg.insertBefore(style, svg.firstChild);
}

export function renderEffectScatter(
  svg: SVGSVGElement,
  series: EffectScatterSeriesOption[],
  xScales: any[],
  yScales: any[],
  geos: GeoOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-effect-scatter");
  if (old) old.remove();
  if (series.length === 0) return;

  ensureRippleStyle(svg);

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-effect-scatter");

  // Build geo viewport if needed
  let geoVP: null | { left: number; top: number; w: number; h: number; minX: number; minY: number; scaleX: number; scaleY: number; cX: number; cY: number } = null;
  const geo = geos[0];
  if (geo) {
    const geoJSON = getRegisteredMap(geo.map ?? "world");
    if (geoJSON) {
      const left = typeof geo.left === "number" ? geo.left : width * 0.05;
      const top = typeof geo.top === "number" ? geo.top : height * 0.05;
      const right = typeof geo.right === "number" ? geo.right : width * 0.05;
      const bottom = typeof geo.bottom === "number" ? geo.bottom : height * 0.05;
      const w = width - left - right;
      const h = height - top - bottom;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const f of (geoJSON.features ?? [])) {
        function walk(c: any, d: number): void {
          if (!Array.isArray(c)) return;
          if (d <= 1 && typeof c[0] === "number") {
            const [px, py] = mercatorProject(c[0], c[1]);
            if (px < minX) minX = px; if (px > maxX) maxX = px;
            if (py < minY) minY = py; if (py > maxY) maxY = py;
          } else { for (const x of c) walk(x, d - 1); }
        }
        const geom = f?.geometry;
        if (!geom) continue;
        const d = geom.type === "Polygon" ? 2 : geom.type === "MultiPolygon" ? 3 : 1;
        walk(geom.coordinates, d);
      }
      if (isFinite(minX)) {
        const spanX = (maxX - minX) || 1;
        const spanY = (maxY - minY) || 1;
        const zoom = geo.zoom ?? 1;
        const scale = Math.min(w / spanX, h / spanY) * zoom;
        geoVP = { left, top, w, h, minX, minY, scaleX: scale, scaleY: scale, cX: (w - spanX * scale) / 2, cY: (h - spanY * scale) / 2 };
      }
    }
  }

  for (let si = 0; si < series.length; si++) {
    const s = series[si];
    if (s.name && hiddenSeries.has(s.name)) continue;

    const color = seriesHex(si);
    const period = s.rippleEffect?.period ?? 2;
    const scale = s.rippleEffect?.scale ?? 3;
    const brushType = s.rippleEffect?.brushType ?? "fill";

    const data = (s.data ?? []) as ([number, number] | [number, number, number])[];

    for (const item of data) {
      const [rawX, rawY, rawSize] = item;
      let cx: number, cy: number;

      const coordSys = s.coordinateSystem ?? "cartesian2d";
      if (coordSys === "geo" && geoVP) {
        const [nx, ny] = mercatorProject(rawX, rawY);
        cx = geoVP.left + (nx - geoVP.minX) * geoVP.scaleX + geoVP.cX;
        cy = geoVP.top + (ny - geoVP.minY) * geoVP.scaleY + geoVP.cY;
      } else {
        const xScale = xScales[(s as any).xAxisIndex ?? 0];
        const yScale = yScales[(s as any).yAxisIndex ?? 0];
        if (!xScale || !yScale) continue;
        cx = xScale.map(rawX);
        cy = yScale.map(rawY);
      }

      const size = typeof s.symbolSize === "function"
        ? s.symbolSize(item)
        : (s.symbolSize ?? (rawSize ? Math.sqrt(rawSize) * 2 : 10));
      const r = size / 2;

      const pointGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

      // Ripple circle (animated)
      const ripple = svgEl("circle", { cx, cy, r, fill: brushType === "fill" ? color : "none", stroke: brushType === "stroke" ? color : "none", "stroke-width": brushType === "stroke" ? 1 : 0 }) as SVGCircleElement;
      ripple.setAttribute("class", "dc-ripple");
      ripple.style.setProperty("--dc-ripple-scale", String(scale));
      ripple.style.setProperty("--dc-ripple-period", `${period}s`);
      pointGroup.appendChild(ripple);

      // Static center dot
      pointGroup.appendChild(svgEl("circle", { cx, cy, r: Math.max(2, r * 0.5), fill: color }));

      group.appendChild(pointGroup);
    }
  }

  svg.appendChild(group);
}
