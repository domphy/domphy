import type { CalendarOption, HeatmapSeriesOption, VisualMapOption } from "../types.js";
import { colorFromVisualMap } from "./visualmap.js";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function parseDate(s: string): Date {
  const parts = s.split("-").map(Number);
  return new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function weekOfYear(d: Date, firstDay = 0): number {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const jan1Day = (jan1.getDay() - firstDay + 7) % 7;
  return Math.floor((dayOfYear(d) + jan1Day - 1) / 7);
}

interface CalendarLayout {
  rect: { x: number; y: number; w: number; h: number };
  cellW: number;
  cellH: number;
  startDate: Date;
  endDate: Date;
  firstDay: number;
  getCell(date: Date): { col: number; row: number } | null;
  getCellPixel(date: Date): { x: number; y: number; w: number; h: number } | null;
}

function buildCalendarLayout(cal: CalendarOption, calIndex: number, width: number, height: number): CalendarLayout {
  const marginL = typeof cal.left === "number" ? cal.left : typeof cal.left === "string" ? parseFloat(cal.left) : width * 0.07;
  const marginT = typeof cal.top === "number" ? cal.top : typeof cal.top === "string" ? parseFloat(cal.top) : height * 0.1 + calIndex * height * 0.35;
  const marginR = typeof cal.right === "number" ? cal.right : typeof cal.right === "string" ? parseFloat(cal.right) : width * 0.03;
  const marginB = typeof cal.bottom === "number" ? cal.bottom : typeof cal.bottom === "string" ? parseFloat(cal.bottom) : height * 0.05;

  const rectW = width - marginL - marginR;
  const rectH = height - marginT - marginB;

  // Parse range
  let startDate: Date;
  let endDate: Date;
  const range = cal.range;
  if (typeof range === "string") {
    if (/^\d{4}$/.test(range)) {
      startDate = new Date(Number(range), 0, 1);
      endDate = new Date(Number(range), 11, 31);
    } else {
      startDate = parseDate(range);
      endDate = new Date(startDate.getFullYear(), 11, 31);
    }
  } else if (Array.isArray(range)) {
    startDate = parseDate(range[0]);
    endDate = parseDate(range[1]);
  } else {
    startDate = new Date(new Date().getFullYear(), 0, 1);
    endDate = new Date(new Date().getFullYear(), 11, 31);
  }

  const firstDay = cal.dayLabel?.firstDay ?? 0;
  const cellSize = cal.cellSize ?? 20;
  const cellW = Array.isArray(cellSize) ? cellSize[0] : cellSize;
  const cellH = Array.isArray(cellSize) ? cellSize[1] : cellSize;

  const rect = { x: marginL, y: marginT, w: rectW, h: rectH };

  function getCell(date: Date): { col: number; row: number } | null {
    if (date < startDate || date > endDate) return null;
    const col = weekOfYear(date, firstDay) - weekOfYear(startDate, firstDay);
    const row = (date.getDay() - firstDay + 7) % 7;
    return { col, row };
  }

  function getCellPixel(date: Date): { x: number; y: number; w: number; h: number } | null {
    const cell = getCell(date);
    if (!cell) return null;
    const x = rect.x + cell.col * cellW;
    const y = rect.y + cell.row * cellH;
    return { x, y, w: cellW, h: cellH };
  }

  return { rect, cellW, cellH, startDate, endDate, firstDay, getCell, getCellPixel };
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function renderCalendar(
  svg: SVGSVGElement,
  calendars: CalendarOption[],
  heatmapSeries: HeatmapSeriesOption[],
  visualMaps: VisualMapOption[],
  width: number,
  height: number,
): void {
  const old = svg.querySelector(".dc-calendar");
  if (old) old.remove();
  if (calendars.length === 0) return;

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "dc-calendar");

  for (let calIndex = 0; calIndex < calendars.length; calIndex++) {
    const cal = calendars[calIndex];
    const layout = buildCalendarLayout(cal, calIndex, width, height);
    const { rect, cellW, cellH, startDate, endDate, firstDay } = layout;

    // Build value map from matching heatmap series
    const valueMap = new Map<string, number>();
    for (const hs of heatmapSeries) {
      if (hs.coordinateSystem !== "calendar") continue;
      if ((hs.calendarIndex ?? 0) !== calIndex) continue;
      const data = (hs.data ?? []) as unknown as [string | number, number][];
      for (const item of data) {
        const rawDate = item[0];
        let dateStr: string;
        if (typeof rawDate === "number") {
          dateStr = dateToString(new Date(rawDate));
        } else {
          dateStr = String(rawDate);
        }
        valueMap.set(dateStr, item[1]);
      }
    }

    // Find visualMap for color scale
    const vm = visualMaps[0];

    // Draw day cells
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const cell = layout.getCellPixel(cur);
      if (cell) {
        const dateStr = dateToString(cur);
        const value = valueMap.get(dateStr);
        let fill = "#f0f0f0";
        if (value !== undefined && vm) {
          fill = colorFromVisualMap(vm, value);
        } else if (value !== undefined) {
          fill = "#91cc75";
        }
        const rx = svgEl("rect", {
          x: cell.x + 1, y: cell.y + 1,
          width: cellW - 2, height: cellH - 2,
          fill, rx: 2,
        });
        group.appendChild(rx);
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Draw month labels
    if (cal.monthLabel?.show !== false) {
      const monthNames = cal.monthLabel?.nameMap ?? MONTH_NAMES;
      for (let m = 0; m < 12; m++) {
        const first = new Date(startDate.getFullYear(), m, 1);
        if (first < startDate || first > endDate) continue;
        const cell = layout.getCellPixel(first);
        if (!cell) continue;
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = monthNames[m] ?? String(m + 1);
        label.setAttribute("x", String(cell.x));
        label.setAttribute("y", String(rect.y - 4));
        label.setAttribute("font-size", "11");
        label.setAttribute("fill", "#666");
        label.setAttribute("pointer-events", "none");
        group.appendChild(label);
      }
    }

    // Draw day-of-week labels
    if (cal.dayLabel?.show !== false) {
      const dayNames = cal.dayLabel?.nameMap ?? DAY_NAMES;
      const margin = cal.dayLabel?.margin ?? 4;
      for (let d = 0; d < 7; d++) {
        const dayIndex = (d + firstDay) % 7;
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = dayNames[dayIndex] ?? "";
        label.setAttribute("x", String(rect.x - margin));
        label.setAttribute("y", String(rect.y + d * cellH + cellH / 2));
        label.setAttribute("font-size", "10");
        label.setAttribute("fill", "#888");
        label.setAttribute("text-anchor", "end");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("pointer-events", "none");
        group.appendChild(label);
      }
    }

    // Draw year label
    if (cal.yearLabel?.show !== false) {
      const yearMargin = cal.yearLabel?.margin ?? 30;
      const yearLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      yearLabel.textContent = String(startDate.getFullYear());
      yearLabel.setAttribute("x", String(rect.x - yearMargin));
      yearLabel.setAttribute("y", String(rect.y + rect.h / 2));
      yearLabel.setAttribute("font-size", "14");
      yearLabel.setAttribute("fill", "#555");
      yearLabel.setAttribute("text-anchor", "middle");
      yearLabel.setAttribute("dominant-baseline", "middle");
      yearLabel.setAttribute("transform", `rotate(-90,${rect.x - yearMargin},${rect.y + rect.h / 2})`);
      yearLabel.setAttribute("pointer-events", "none");
      group.appendChild(yearLabel);
    }
  }

  svg.appendChild(group);
}
