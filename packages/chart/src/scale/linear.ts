export interface LinearScale {
  type: "linear";
  domain: [number, number];
  range: [number, number];
  map(value: number): number;
  invert(pixel: number): number;
  ticks(count?: number): number[];
  bandwidth(): number;
  format(value: number): string;
}

// Computes "nice" tick values using a simplified Wilkinson-style algorithm
function niceTicks(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step = niceStep(span / count);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const result: number[] = [];
  let current = niceMin;
  while (current <= niceMax + step * 0.01) {
    result.push(+current.toPrecision(12));
    current += step;
  }
  return result;
}

function niceStep(roughStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  if (residual < 1.5) return magnitude;
  if (residual < 3) return 2 * magnitude;
  if (residual < 7) return 5 * magnitude;
  return 10 * magnitude;
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1e6) return (value / 1e6).toPrecision(3) + "M";
  if (Math.abs(value) >= 1e3) return (value / 1e3).toPrecision(3) + "K";
  // Show enough decimals to distinguish neighboring ticks
  const str = value.toPrecision(6).replace(/\.?0+$/, "");
  return str;
}

export function createLinearScale(
  domain: [number, number],
  range: [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const domainSpan = d1 - d0 || 1;
  const rangeSpan = r1 - r0;

  return {
    type: "linear",
    domain,
    range,
    map(value: number) {
      return r0 + ((value - d0) / domainSpan) * rangeSpan;
    },
    invert(pixel: number) {
      return d0 + ((pixel - r0) / rangeSpan) * domainSpan;
    },
    ticks(count = 5) {
      return niceTicks(d0, d1, count);
    },
    bandwidth() {
      return 0;
    },
    format: formatTick,
  };
}
