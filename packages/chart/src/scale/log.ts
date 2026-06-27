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

export function createLogScale(
  domain: [number, number],
  range: [number, number],
  base = 10,
): LogScale {
  const logBase = Math.log(base);
  const log = (v: number) => Math.log(Math.abs(v)) / logBase;
  const [d0, d1] = domain;
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
      return r0 + ((log(value) - l0) / logSpan) * rangeSpan;
    },
    invert(pixel: number) {
      const logVal = l0 + ((pixel - r0) / rangeSpan) * logSpan;
      return Math.pow(base, logVal);
    },
    ticks(count = 5) {
      const result: number[] = [];
      const start = Math.ceil(l0);
      const end = Math.floor(l1);
      for (let i = start; i <= end; i++) {
        result.push(Math.pow(base, i));
      }
      // Add intermediate ticks if sparse
      if (result.length < count / 2 && count > 2) {
        const subs = [2, 3, 5];
        for (const s of subs) {
          for (let i = start - 1; i < end; i++) {
            const val = s * Math.pow(base, i);
            if (val >= d0 && val <= d1) result.push(val);
          }
        }
        result.sort((a, b) => a - b);
      }
      return result.filter((v) => v >= d0 && v <= d1);
    },
    bandwidth() { return 0; },
    format(value: number) {
      const exp = Math.round(log(value));
      if (base === 10) return `10^${exp}`;
      return `${base}^${exp}`;
    },
  };
}
