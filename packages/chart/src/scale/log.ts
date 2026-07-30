export interface LogScale {
  type: "log";
  domain: [number, number];
  range: [number, number];
  base: number;
  map(value: number): number;
  invert(pixel: number): number;
  ticks(count?: number): number[];
  bandwidth(): number;
  format(value: number): string;
}

// ECharts-consistent semantics: non-positive values cannot be plotted on a log
// axis and are treated as invalid.
// - A domain bound <= 0 cannot be logged at all (it would poison every map()
//   with NaN/-Infinity), so we warn once per offending bound and clamp it to a
//   tiny positive epsilon (1e-12 — a real, readable magnitude rather than
//   Number.MIN_VALUE's denormal) to keep the scale usable.
// - map(v) for v <= 0 returns NaN, signalling the caller to skip the point,
//   instead of silently folding it in via Math.abs().
// - invert() is unchanged and always returns positive values.
const LOG_DOMAIN_EPSILON = 1e-12;

export function createLogScale(
  domain: [number, number],
  range: [number, number],
  base = 10,
): LogScale {
  const logBase = Math.log(base);
  const log = (v: number) => Math.log(v) / logBase;
  const clampBound = (d: number): number => {
    if (d > 0) return d;
    console.warn(
      `@domphy/chart: log scale domain bound ${d} is not positive and cannot be plotted on a log axis; clamping it to ${LOG_DOMAIN_EPSILON}.`,
    );
    return LOG_DOMAIN_EPSILON;
  };
  const d0 = clampBound(domain[0]);
  const d1 = clampBound(domain[1]);
  const [r0, r1] = range;
  const l0 = log(d0);
  const l1 = log(d1);
  const logSpan = l1 - l0 || 1;
  const rangeSpan = r1 - r0;

  return {
    type: "log",
    domain,
    range,
    base,
    map(value: number) {
      // Non-positive values cannot be plotted on a log axis — return NaN so
      // the caller skips the point instead of drawing it at a wrong position.
      if (value <= 0) return NaN;
      return r0 + ((log(value) - l0) / logSpan) * rangeSpan;
    },
    invert(pixel: number) {
      const logVal = l0 + ((pixel - r0) / rangeSpan) * logSpan;
      return base ** logVal;
    },
    ticks(count = 5) {
      const result: number[] = [];
      const start = Math.ceil(l0);
      const end = Math.floor(l1);
      for (let i = start; i <= end; i++) {
        result.push(base ** i);
      }
      // Add intermediate ticks if sparse
      if (result.length < count / 2 && count > 2) {
        const subs = [2, 3, 5];
        for (const s of subs) {
          for (let i = start - 1; i < end; i++) {
            const val = s * base ** i;
            if (val >= d0 && val <= d1) result.push(val);
          }
        }
        result.sort((a, b) => a - b);
      }
      return result.filter((v) => v >= d0 && v <= d1);
    },
    bandwidth() {
      return 0;
    },
    format(value: number) {
      const exp = Math.round(log(value));
      if (base === 10) return `10^${exp}`;
      return `${base}^${exp}`;
    },
  };
}
