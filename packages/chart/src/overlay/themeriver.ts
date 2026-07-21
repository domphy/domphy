import { seriesHex } from "../gl/color.js";
import type { ThemeRiverSeriesOption } from "../types.js";

function svgEl(
  tag: string,
  attrs: Record<string, string | number>,
): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function catmullRomToBezier(points: [number, number][]): string {
  if (points.length < 2) return "";
  const tension = 0.5;
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1[0] + ((p2[0] - p0[0]) * tension) / 3;
    const cp1y = p1[1] + ((p2[1] - p0[1]) * tension) / 3;
    const cp2x = p2[0] - ((p3[0] - p1[0]) * tension) / 3;
    const cp2y = p2[1] - ((p3[1] - p1[1]) * tension) / 3;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function renderThemeRiver(
  svg: SVGSVGElement,
  series: ThemeRiverSeriesOption[],
  width: number,
  height: number,
  hiddenSeries: Set<string>,
): void {
  const old = svg.querySelector(".dc-themeriver");
  if (old) old.remove();
  if (series.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-themeriver");

  const s = series[0];
  if (!s.data || s.data.length === 0) {
    svg.appendChild(group);
    return;
  }

  const marginL = width * 0.05;
  const marginR = width * 0.05;
  const marginT = height * 0.1;
  const marginB = height * 0.1;
  const drawW = width - marginL - marginR;
  const drawH = height - marginT - marginB;

  // Collect unique names and time points
  const names = new Set<string>();
  const timesSet = new Set<number>();

  for (const item of s.data) {
    const timeRaw = item[0];
    const name = item[2];
    names.add(name);
    if (typeof timeRaw === "number") {
      timesSet.add(timeRaw);
    } else {
      timesSet.add(new Date(String(timeRaw)).getTime());
    }
  }

  const uniqueNames = [...names].filter((n) => !hiddenSeries.has(n));
  const times = [...timesSet].sort((a, b) => a - b);
  if (times.length < 2 || uniqueNames.length === 0) {
    svg.appendChild(group);
    return;
  }

  const minTime = times[0];
  const maxTime = times[times.length - 1];

  // Build value matrix: values[nameIdx][timeIdx]
  const valueMatrix: number[][] = uniqueNames.map(() => times.map(() => 0));
  for (const item of s.data) {
    const timeRaw = item[0];
    const value = item[1];
    const name = item[2];
    const nameIdx = uniqueNames.indexOf(name);
    if (nameIdx < 0) continue;
    const t =
      typeof timeRaw === "number"
        ? timeRaw
        : new Date(String(timeRaw)).getTime();
    const timeIdx = times.indexOf(t);
    if (timeIdx >= 0) valueMatrix[nameIdx][timeIdx] = value;
  }

  // Compute stacked heights per time with silhouette centering
  const totalAtTime: number[] = times.map((_, ti) =>
    uniqueNames.reduce((sum, _, ni) => sum + valueMatrix[ni][ti], 0),
  );
  const maxTotal = Math.max(...totalAtTime, 1);

  // For each time, compute layer positions using wiggle/silhouette baseline
  // baseline[ti] centers streams: starts at -totalAtTime[ti]/2
  const baselines: number[][] = uniqueNames.map(() =>
    new Array(times.length).fill(0),
  );

  for (let ti = 0; ti < times.length; ti++) {
    let runningY = -totalAtTime[ti] / 2;
    for (let ni = 0; ni < uniqueNames.length; ni++) {
      baselines[ni][ti] = runningY;
      runningY += valueMatrix[ni][ti];
    }
  }

  // Time to x pixel
  const timeToX = (t: number): number =>
    marginL + ((t - minTime) / (maxTime - minTime)) * drawW;

  // Value to y pixel: domain is [-maxTotal/2, maxTotal/2], map to [marginT+drawH, marginT]
  const valToY = (v: number): number =>
    marginT + drawH / 2 - (v / maxTotal) * drawH;

  // Draw each stream as a band
  for (let ni = 0; ni < uniqueNames.length; ni++) {
    const color = seriesHex(ni);

    // Upper edge: baseline[ni] + value
    const upperPoints: [number, number][] = times.map((t, ti) => [
      timeToX(t),
      valToY(baselines[ni][ti] + valueMatrix[ni][ti]),
    ]);

    // Lower edge: baseline[ni], reversed
    const lowerPoints: [number, number][] = [...times]
      .reverse()
      .map((t, ri) => {
        const ti = times.length - 1 - ri;
        return [timeToX(t), valToY(baselines[ni][ti])];
      });

    // Build smooth path
    const upperPath = catmullRomToBezier(upperPoints);
    const lowerPath = catmullRomToBezier(lowerPoints);

    if (!upperPath || !lowerPath) continue;

    // Close the path: upper edge forward, lower edge backward
    const lastUpper = upperPoints[upperPoints.length - 1];
    const firstLower = lowerPoints[0];
    const d = `${upperPath} L ${firstLower[0]},${firstLower[1]} ${lowerPath.slice(1)} L ${upperPoints[0][0]},${upperPoints[0][1]} Z`;

    const pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathEl.setAttribute("d", d);
    pathEl.setAttribute("fill", color);
    pathEl.setAttribute("opacity", "0.8");
    pathEl.setAttribute("stroke", "none");
    group.appendChild(pathEl);

    // Label at midpoint
    const midTi = Math.floor(times.length / 2);
    const midX = timeToX(times[midTi]);
    const midY = valToY(baselines[ni][midTi] + valueMatrix[ni][midTi] / 2);
    if (valueMatrix[ni][midTi] > 0) {
      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      label.textContent = uniqueNames[ni];
      label.setAttribute("x", String(midX));
      label.setAttribute("y", String(midY));
      label.setAttribute("font-size", "11");
      label.setAttribute("fill", "#fff");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "middle");
      label.setAttribute("pointer-events", "none");
      group.appendChild(label);
    }
  }

  // Draw time axis labels
  const labelCount = Math.min(times.length, 8);
  for (let i = 0; i < labelCount; i++) {
    const ti = Math.round((i / (labelCount - 1)) * (times.length - 1));
    const t = times[ti];
    const x = timeToX(t);
    const label = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    label.textContent = new Date(t).toLocaleDateString();
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(height - marginB + 14));
    label.setAttribute("font-size", "10");
    label.setAttribute("fill", "#888");
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("pointer-events", "none");
    group.appendChild(label);
  }

  svg.appendChild(group);
}
