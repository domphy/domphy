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
  // ECharts axis.boundaryGap: true (default) gives each category a band and
  // places it at the band's center, leaving half a band of padding at both
  // ends — what bars need. false places category i directly on the axis, so a
  // line starts flush against the y axis and ends at the right edge.
  boundaryGap = true,
): OrdinalScale {
  const [r0, r1] = range;
  const count = domain.length || 1;
  const totalRange = r1 - r0;
  // ECharts Axis#getBandWidth(): `size / (dataExtent[1] - dataExtent[0] +
  // (onBand ? 1 : 0))`, i.e. size/n with a boundary gap and size/(n-1)
  // without — never zero. Band-sized series (bar, candlestick, boxplot,
  // heatmap) stay visible on a boundaryGap:false axis; they just straddle the
  // ticks and clip at the ends, exactly as they do in ECharts.
  const step = boundaryGap ? totalRange / count : totalRange / (count - 1 || 1);
  const innerWidth = step * (1 - padding);
  const offset = boundaryGap ? 0.5 : 0;

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
        return r0 + (index + offset) * step;
      }
      // Numeric index: clamp symmetrically with invert() — out-of-domain
      // indices snap to the first/last band instead of mapping outside the
      // range.
      const index = Math.max(0, Math.min(count - 1, value));
      // Center of the band (or the tick itself without a boundary gap).
      return r0 + (index + offset) * step;
    },
    invert(pixel: number) {
      const index = boundaryGap
        ? Math.floor((pixel - r0) / step)
        : Math.round((pixel - r0) / step);
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
