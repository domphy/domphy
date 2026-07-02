import { describe, expect, it } from "vitest";
import { Ramp } from "../src/index";

// Edge cases for the n<2 / n<3 early returns and a deliberately non-monotone
// ramp. Values are characterization captures of the current implementation.
describe("Ramp edge cases", () => {
  it("empty ramp does not throw and reports neutral metrics", () => {
    const ramp = new Ramp([]);
    expect(ramp.steps).toBe(0);
    expect(ramp.baseColor).toBe("");
    expect(ramp.baseIndex).toBe(-1);
    // Every metric short-circuits to 1 when there is nothing to measure.
    expect(ramp.metrics).toEqual({
      lightnessLinearity: 1,
      chromaSmoothness: 1,
      spacingUniformity: 1,
      hueStability: 1,
      contrastEfficiency: 1,
    });
    expect(ramp.score).toBe(100);
  });

  it("single-color ramp short-circuits all metrics to 1", () => {
    const ramp = new Ramp(["#3b82f6"]);
    expect(ramp.steps).toBe(1);
    expect(ramp.baseColor).toBe("#3b82f6");
    expect(ramp.baseIndex).toBe(0);
    expect(ramp.metrics).toEqual({
      lightnessLinearity: 1,
      chromaSmoothness: 1,
      spacingUniformity: 1,
      hueStability: 1,
      contrastEfficiency: 1,
    });
    expect(ramp.score).toBe(100);
  });

  it("wcag and apca efficiency stay finite (not NaN) for a single-color ramp", () => {
    const ramp = new Ramp(["#3b82f6"]);
    for (const level of [30, 45, 70] as const) {
      expect(Number.isFinite(ramp.wcag[level].efficiency)).toBe(true);
    }
    for (const level of [45, 60, 75] as const) {
      expect(Number.isFinite(ramp.apca[level].efficiency)).toBe(true);
    }
  });

  it("two-color ramp: chromaSmoothness early-returns 1 (n<3) but contrastEfficiency is 0", () => {
    const ramp = new Ramp(["#ffffff", "#000000"]);
    expect(ramp.steps).toBe(2);
    // n<3 early return keeps chroma smoothness at 1.
    expect(ramp.metrics.chromaSmoothness).toBe(1);
    // A single gap spanning the full range yields zero contrast efficiency.
    expect(ramp.metrics.contrastEfficiency).toBe(0);
    expect(ramp.score).toBeCloseTo(6.31, 2);
  });

  it("non-monotone lightness ramp drops lightnessLinearity below 1", () => {
    const ramp = new Ramp(["#ffffff", "#000000", "#ffffff", "#000000"]);
    expect(ramp.steps).toBe(4);
    expect(ramp.metrics.lightnessLinearity).toBeCloseTo(0.1229, 3);
    expect(ramp.metrics.lightnessLinearity).toBeLessThan(1);
    expect(ramp.score).toBeCloseTo(65.76, 2);
  });

  it("every metric stays finite and within [0, 1] for the edge ramps", () => {
    for (const colors of [
      [] as string[],
      ["#3b82f6"],
      ["#ffffff", "#000000"],
      ["#ffffff", "#000000", "#ffffff", "#000000"],
    ]) {
      const ramp = new Ramp(colors);
      for (const value of Object.values(ramp.metrics)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
