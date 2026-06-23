import { describe, expect, it } from "vitest";
import {
  calcDeltaE2000,
  calcScore,
  calcStatistics,
  createMonotone,
  cssRgbToRgb,
  fromLightnessEAL,
  hexToRgb,
  labToLch,
  labToRgb,
  lchToLab,
  oklabToRgb,
  rgbToHex,
  rgbToLab,
  rgbToOklab,
  rootMeanSquare,
  toLightnessEAL,
} from "../src/index";

const allFinite = (values: number[]) => values.every(Number.isFinite);

describe("hex <-> rgb round trip", () => {
  it("rgbToHex(hexToRgb(hex)) is identity for an exact 8-bit color", () => {
    expect(rgbToHex(hexToRgb("#3b82f6"))).toBe("#3b82f6");
    expect(rgbToHex(hexToRgb("#000000"))).toBe("#000000");
    expect(rgbToHex(hexToRgb("#ffffff"))).toBe("#ffffff");
  });

  it("hexToRgb returns linear RGB in [0, 1]", () => {
    const rgb = hexToRgb("#ff0000");
    expect(rgb).toEqual([1, 0, 0]);
  });
});

describe("rgbToLab known values", () => {
  it("linear white maps to L=100, a≈0, b≈0", () => {
    const [L, a, b] = rgbToLab([1, 1, 1]);
    expect(L).toBeCloseTo(100, 4);
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });
});

describe("labToLch", () => {
  it("collapses near-achromatic colors to zero chroma and hue", () => {
    expect(labToLch([50, 0, 0])).toEqual([50, 0, 0]);
  });

  it("computes chroma and hue for a chromatic color", () => {
    const [L, C, h] = labToLch([50, 0, 20]);
    expect(L).toBe(50);
    expect(C).toBeCloseTo(20, 6);
    expect(h).toBeCloseTo(90, 6);
  });
});

describe("cssRgbToRgb", () => {
  it("parses an rgb() string to linear RGB matching hexToRgb", () => {
    expect(cssRgbToRgb("rgb(255, 0, 0)")).toEqual(hexToRgb("#ff0000"));
  });

  it("throws on an unparseable string", () => {
    expect(() => cssRgbToRgb("not a color")).toThrow(/Invalid CSS/);
  });
});

describe("createMonotone", () => {
  it("preserves endpoints and clamps outside the input range", () => {
    const interpolate = createMonotone([
      [0, 0],
      [1, 10],
      [2, 20],
    ]);
    expect(interpolate(0)).toBe(0);
    expect(interpolate(2)).toBe(20);
    // Out-of-range inputs clamp to the nearest endpoint value.
    expect(interpolate(-5)).toBe(0);
    expect(interpolate(99)).toBe(20);
  });

  it("stays monotonically non-decreasing across a sampled grid", () => {
    const interpolate = createMonotone([
      [0, 0],
      [1, 5],
      [2, 5],
      [3, 30],
    ]);
    let previous = Number.NEGATIVE_INFINITY;
    for (let i = 0; i <= 30; i++) {
      const value = interpolate(i / 10);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = value;
    }
  });

  it("returns a constant for a single point", () => {
    const interpolate = createMonotone([[0, 7]]);
    expect(interpolate(0)).toBe(7);
    expect(interpolate(123)).toBe(7);
  });
});

describe("calcScore", () => {
  it("returns the geometric mean scaled to 0-100", () => {
    expect(calcScore([1, 1, 1, 1, 1])).toBe(100);
    expect(calcScore([0.5, 0.5])).toBe(50);
  });

  it("returns 0 for an empty metric list", () => {
    expect(calcScore([])).toBe(0);
  });

  it("clamps inputs above 1 to a max score of 100", () => {
    expect(calcScore([2, 2])).toBe(100);
  });
});

describe("rootMeanSquare", () => {
  it("computes RMS of a value list", () => {
    expect(rootMeanSquare([3, 4])).toBeCloseTo(Math.sqrt(12.5), 9);
  });

  it("returns 0 for an empty list", () => {
    expect(rootMeanSquare([])).toBe(0);
  });
});

// Smoke coverage for every still-exported (public-API) utility, including the
// ones no longer referenced internally. Each must return finite output.
describe("public utility smoke tests", () => {
  it("rgbToHex / hexToRgb", () => {
    expect(allFinite(hexToRgb("#3b82f6"))).toBe(true);
    expect(typeof rgbToHex([0.1, 0.2, 0.3])).toBe("string");
  });

  it("rgbToOklab / oklabToRgb round trip is finite and near identity", () => {
    const oklab = rgbToOklab([0.5, 0.5, 0.5]);
    expect(allFinite(oklab)).toBe(true);
    const back = oklabToRgb(oklab);
    expect(allFinite(back)).toBe(true);
    back.forEach((channel) => expect(channel).toBeCloseTo(0.5, 4));
  });

  it("labToRgb / lchToLab", () => {
    expect(allFinite(labToRgb([50, 10, 10]))).toBe(true);
    expect(allFinite(lchToLab([50, 20, 90]))).toBe(true);
  });

  it("toLightnessEAL / fromLightnessEAL", () => {
    const lab = rgbToLab(hexToRgb("#3b82f6"));
    const eal = toLightnessEAL(lab);
    expect(Number.isFinite(eal)).toBe(true);
    // fromLightnessEAL recovers the underlying CIELAB L within [0, eal].
    const recovered = fromLightnessEAL(eal, lab);
    expect(Number.isFinite(recovered)).toBe(true);
    expect(recovered).toBeCloseTo(lab[0], 4);
  });

  it("calcStatistics", () => {
    const stats = calcStatistics([1, 2, 3]);
    expect(stats).toEqual({ min: 1, max: 3, avg: 2 });
  });

  it("calcDeltaE2000 is finite", () => {
    expect(Number.isFinite(calcDeltaE2000([50, 0, 0], [60, 10, 10]))).toBe(
      true,
    );
  });
});
