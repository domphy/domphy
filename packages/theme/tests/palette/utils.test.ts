import { describe, expect, it } from "vitest";
import {
  calcDeltaE2000,
  calcScore,
  calcStatistics,
  createMonotone,
  cssRgbToRgb,
  fromLightnessEAL,
  hexToRgb,
  isValidHex,
  labToLch,
  labToRgb,
  lchToLab,
  normalizeHex,
  oklabToRgb,
  rgbToHex,
  rgbToLab,
  rgbToOklab,
  rootMeanSquare,
  scale,
  toLightnessEAL,
} from "../../src/index";

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

describe("hexToRgb input validation", () => {
  it("expands the 3-digit shorthand", () => {
    expect(hexToRgb("#fff")).toEqual(hexToRgb("#ffffff"));
    expect(hexToRgb("#f00")).toEqual([1, 0, 0]);
  });

  it("accepts 4- and 8-digit forms and ignores the alpha channel", () => {
    expect(hexToRgb("#ffff")).toEqual(hexToRgb("#ffffff"));
    expect(hexToRgb("#ff000080")).toEqual(hexToRgb("#ff0000"));
  });

  it("accepts uppercase hex digits", () => {
    expect(hexToRgb("#FF0000")).toEqual([1, 0, 0]);
    expect(hexToRgb("#FFF")).toEqual([1, 1, 1]);
  });

  it("throws with the offending input for non-hex characters", () => {
    expect(() => hexToRgb("#zzz")).toThrow(/#zzz/);
    expect(() => hexToRgb("#zzzzzz")).toThrow(/#zzzzzz/);
  });

  it("throws for a missing leading #", () => {
    expect(() => hexToRgb("ff0000")).toThrow(/ff0000/);
  });

  it("throws for wrong lengths", () => {
    expect(() => hexToRgb("#ff")).toThrow(/#ff/);
    expect(() => hexToRgb("#fffff")).toThrow(/#fffff/);
    expect(() => hexToRgb("#fffffff")).toThrow(/#fffffff/);
  });
});

describe("isValidHex", () => {
  it("accepts all supported forms, case-insensitively", () => {
    for (const hex of [
      "#fff",
      "#ffff",
      "#ffffff",
      "#ffffffff",
      "#FFF",
      "#AbCdEf",
    ]) {
      expect(isValidHex(hex)).toBe(true);
    }
  });

  it("rejects non-hex characters, missing #, and wrong lengths", () => {
    for (const hex of [
      "#zzz",
      "fff",
      "#ff",
      "#fffff",
      "#fffffff",
      "",
      "#123456789",
    ]) {
      expect(isValidHex(hex)).toBe(false);
    }
  });
});

describe("normalizeHex", () => {
  it("expands shorthand to lowercase #rrggbb", () => {
    expect(normalizeHex("#FFF")).toBe("#ffffff");
    expect(normalizeHex("#f00")).toBe("#ff0000");
  });

  it("keeps the alpha channel in lowercase #rrggbbaa", () => {
    expect(normalizeHex("#FFFF")).toBe("#ffffffff");
    expect(normalizeHex("#FF000080")).toBe("#ff000080");
  });

  it("lowercases an already-full hex", () => {
    expect(normalizeHex("#3B82F6")).toBe("#3b82f6");
  });

  it("throws on invalid input", () => {
    expect(() => normalizeHex("#zzz")).toThrow(/#zzz/);
    expect(() => normalizeHex("fff")).toThrow(/fff/);
  });
});

describe("rgbToLab known values", () => {
  it("linear white maps to L=100, a≈0, b≈0", () => {
    const [L, a, b] = rgbToLab([1, 1, 1]);
    expect(L).toBeCloseTo(100, 4);
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });

  // Absolute references cross-checked against colormath 3.0 (Python) and
  // Bruce Lindbloom's CIE calculator; residual error is the 4-7-digit
  // sRGB<->XYZ matrix precision, bounded well under 0.01 Lab units.
  it("sRGB red maps to the canonical CIELAB value", () => {
    const [L, a, b] = rgbToLab(hexToRgb("#ff0000"));
    expect(L).toBeCloseTo(53.241, 2);
    expect(a).toBeCloseTo(80.092, 2);
    expect(b).toBeCloseTo(67.203, 2);
  });

  it("a mid chromatic blue matches the colormath reference", () => {
    const [L, a, b] = rgbToLab(hexToRgb("#4a7ff4"));
    // colormath: (55.2413, 20.5468, -63.9205); matrix-constant precision
    // accounts for up to ~0.008 units, so bound at 0.01.
    expect(Math.abs(L - 55.2413)).toBeLessThan(0.01);
    expect(Math.abs(a - 20.5468)).toBeLessThan(0.01);
    expect(Math.abs(b - -63.9205)).toBeLessThan(0.01);
  });
});

describe("rgbToOklab known values", () => {
  // Ottosson's published reference for linear sRGB red (2020 spec post).
  it("linear sRGB red maps to the published Oklab value", () => {
    const [L, a, b] = rgbToOklab([1, 0, 0]);
    expect(L).toBeCloseTo(0.6279554, 6);
    expect(a).toBeCloseTo(0.2248631, 6);
    expect(b).toBeCloseTo(0.1258463, 6);
  });
});

describe("calcDeltaE2000 known values", () => {
  // Cross-checked against colormath 3.0 delta_e_cie2000 (agrees to < 0.002).
  it("red vs green matches the independent reference", () => {
    const dE = calcDeltaE2000(
      rgbToLab(hexToRgb("#ff0000")),
      rgbToLab(hexToRgb("#00ff00")),
    );
    expect(dE).toBeCloseTo(86.608, 2);
  });

  it("white vs black is ~100 and identical colors are 0", () => {
    expect(
      calcDeltaE2000(
        rgbToLab(hexToRgb("#ffffff")),
        rgbToLab(hexToRgb("#000000")),
      ),
    ).toBeCloseTo(100, 1);
    expect(
      calcDeltaE2000(
        rgbToLab(hexToRgb("#808080")),
        rgbToLab(hexToRgb("#808080")),
      ),
    ).toBe(0);
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

  it("keeps legacy rgba() comma syntax, ignoring alpha", () => {
    expect(cssRgbToRgb("rgba(255, 0, 0, 0.5)")).toEqual(hexToRgb("#ff0000"));
  });

  it("parses percentage channels", () => {
    expect(cssRgbToRgb("rgb(100%, 0%, 0%)")).toEqual(hexToRgb("#ff0000"));
    // 50%/25% of 255 round to 128/64 when encoded back to 8-bit hex.
    expect(rgbToHex(cssRgbToRgb("rgb(50%, 25%, 0%)"))).toBe("#804000");
  });

  it("parses modern space/slash syntax, ignoring alpha", () => {
    expect(cssRgbToRgb("rgb(255 0 0)")).toEqual(hexToRgb("#ff0000"));
    expect(cssRgbToRgb("rgb(255 0 0 / 50%)")).toEqual(hexToRgb("#ff0000"));
  });

  it("throws on an unparseable string", () => {
    expect(() => cssRgbToRgb("not a color")).toThrow(/Invalid CSS/);
  });

  it("throws on a wrong channel count", () => {
    expect(() => cssRgbToRgb("rgb(255, 0)")).toThrow(/Invalid CSS/);
    expect(() => cssRgbToRgb("rgb(255 0)")).toThrow(/Invalid CSS/);
  });
});

describe("scale single-step normalization", () => {
  it("normalizes the anchor for steps === 1 like the multi-step path", () => {
    expect(scale(["#FFF", "#000000"], 1)).toEqual(["#ffffff"]);
    expect(scale(["#4A7FF4", "#000000"], 1)).toEqual(["#4a7ff4"]);
  });

  it("throws on an invalid anchor for steps === 1", () => {
    expect(() => scale(["#zzz", "#000000"], 1)).toThrow(/#zzz/);
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
