export interface TimeScale {
  type: "time";
  domain: [Date, Date];
  range: [number, number];
  map(value: Date | number | string): number;
  invert(pixel: number): Date;
  ticks(count?: number): Date[];
  bandwidth(): number;
  format(value: Date | number | string): string;
}

const MS = { second: 1000, minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2628000000, year: 31536000000 };

function floorDate(date: Date, unit: keyof typeof MS): Date {
  const d = new Date(date);
  if (unit === "second") { d.setMilliseconds(0); }
  else if (unit === "minute") { d.setSeconds(0, 0); }
  else if (unit === "hour") { d.setMinutes(0, 0, 0); }
  else if (unit === "day") { d.setHours(0, 0, 0, 0); }
  else if (unit === "week") { d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); }
  else if (unit === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); }
  else if (unit === "year") { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
  return d;
}

function stepDate(date: Date, unit: keyof typeof MS, count = 1): Date {
  const d = new Date(date);
  if (unit === "second") d.setSeconds(d.getSeconds() + count);
  else if (unit === "minute") d.setMinutes(d.getMinutes() + count);
  else if (unit === "hour") d.setHours(d.getHours() + count);
  else if (unit === "day") d.setDate(d.getDate() + count);
  else if (unit === "week") d.setDate(d.getDate() + count * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + count);
  else if (unit === "year") d.setFullYear(d.getFullYear() + count);
  return d;
}

function pickUnit(spanMs: number, count: number): { unit: keyof typeof MS; step: number } {
  const roughMs = spanMs / count;
  if (roughMs < MS.minute * 2) return { unit: "second", step: niceStep(roughMs / MS.second, [1, 2, 5, 10, 15, 30]) };
  if (roughMs < MS.hour * 2) return { unit: "minute", step: niceStep(roughMs / MS.minute, [1, 2, 5, 10, 15, 30]) };
  if (roughMs < MS.day * 2) return { unit: "hour", step: niceStep(roughMs / MS.hour, [1, 2, 3, 6, 12]) };
  if (roughMs < MS.week * 4) return { unit: "day", step: niceStep(roughMs / MS.day, [1, 2, 7]) };
  if (roughMs < MS.month * 6) return { unit: "month", step: niceStep(roughMs / MS.month, [1, 2, 3, 6]) };
  return { unit: "year", step: niceStep(roughMs / MS.year, [1, 2, 5, 10]) };
}

function niceStep(rough: number, steps: number[]): number {
  for (const step of steps) { if (rough <= step) return step; }
  return steps[steps.length - 1];
}

function formatDate(date: Date, spanMs: number): string {
  if (spanMs < MS.day * 2) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (spanMs < MS.year) return date.toLocaleDateString([], { month: "short", day: "numeric" });
  return String(date.getFullYear());
}

function toDate(value: Date | number | string): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

export function createTimeScale(
  domain: [Date | number | string, Date | number | string],
  range: [number, number],
): TimeScale {
  const d0 = toDate(domain[0]).getTime();
  const d1 = toDate(domain[1]).getTime();
  const [r0, r1] = range;
  const spanMs = d1 - d0 || 1;
  const rangeSpan = r1 - r0;

  return {
    type: "time",
    domain: [new Date(d0), new Date(d1)],
    range,
    map(value) {
      const ms = toDate(value).getTime();
      return r0 + ((ms - d0) / spanMs) * rangeSpan;
    },
    invert(pixel) {
      const ms = d0 + ((pixel - r0) / rangeSpan) * spanMs;
      return new Date(ms);
    },
    ticks(count = 5) {
      const { unit, step } = pickUnit(spanMs, count);
      const result: Date[] = [];
      let current = stepDate(floorDate(new Date(d0), unit), unit, 0);
      const endDate = new Date(d1);
      while (current <= endDate) {
        if (current.getTime() >= d0) result.push(new Date(current));
        current = stepDate(current, unit, step);
        if (result.length > 100) break;
      }
      return result;
    },
    bandwidth() { return 0; },
    format(value) { return formatDate(toDate(value), spanMs); },
  };
}
