export interface OrdinalScale {
  type: "ordinal";
  domain: string[];
  range: [number, number];
  map(value: string | number): number;
  invert(pixel: number): string;
  ticks(): string[];
  bandwidth(): number;
  format(value: string | number): string;
  padding: number;
}

export function createOrdinalScale(
  domain: string[],
  range: [number, number],
  padding = 0.2,
): OrdinalScale {
  const [r0, r1] = range;
  const count = domain.length || 1;
  const totalRange = r1 - r0;
  const step = totalRange / count;
  const innerWidth = step * (1 - padding);

  return {
    type: "ordinal",
    domain,
    range,
    padding,
    map(value: string | number) {
      const index = typeof value === "number" ? value : domain.indexOf(value);
      if (index < 0) return r0;
      // Center of the band
      return r0 + (index + 0.5) * step;
    },
    invert(pixel: number) {
      const index = Math.floor((pixel - r0) / step);
      return domain[Math.max(0, Math.min(count - 1, index))] ?? "";
    },
    ticks() {
      return domain;
    },
    bandwidth() {
      return innerWidth;
    },
    format(value: string | number) {
      return String(value);
    },
  };
}
