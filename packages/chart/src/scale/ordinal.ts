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
      if (typeof value !== "number") {
        const index = domain.indexOf(value);
        // Unknown category: fall back to the range start (existing contract).
        if (index < 0) return r0;
        return r0 + (index + 0.5) * step;
      }
      // Numeric index: clamp symmetrically with invert() — out-of-domain
      // indices snap to the first/last band instead of mapping outside the
      // range.
      const index = Math.max(0, Math.min(count - 1, value));
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
