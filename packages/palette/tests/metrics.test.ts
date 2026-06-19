import { describe, expect, it } from "vitest";
import { Palette, Ramp, Swatch } from "../src/index";

const inRange = (value: number, min = 0, max = 1) => {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

// 18-step blue ramp (white → blue → black) used as static test fixture.
const BLUE_18 = [
  "#ffffff",
  "#dce8fd",
  "#b9d2fb",
  "#96bcf9",
  "#73a6f7",
  "#5090f5",
  "#3b82f6",
  "#2f6bd4",
  "#2354b2",
  "#173d90",
  "#0b266e",
  "#08205c",
  "#061a4a",
  "#051438",
  "#040e26",
  "#030814",
  "#020408",
  "#000000",
];

const GREEN_18 = [
  "#ffffff",
  "#d8f5e4",
  "#b1ebc9",
  "#8ae1ae",
  "#63d793",
  "#3ccd78",
  "#22c55e",
  "#1baa50",
  "#148f42",
  "#0d7434",
  "#065926",
  "#053e1b",
  "#042310",
  "#030e05",
  "#020800",
  "#010300",
  "#000000",
  "#000000",
];

describe("Swatch", () => {
  it("exposes finite color coordinates", () => {
    const swatch = new Swatch("#3b82f6");
    expect(swatch.lab.every(Number.isFinite)).toBe(true);
    expect(swatch.lch.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(swatch.lightness)).toBe(true);
    expect(Number.isFinite(swatch.chroma)).toBe(true);
    expect(Number.isFinite(swatch.hue)).toBe(true);
    inRange(swatch.luminance);
  });
});

describe("Ramp metrics", () => {
  const ramp = new Ramp(BLUE_18, "blue");

  it("metric getters return finite numbers in [0, 1]", () => {
    const { metrics } = ramp;
    inRange(metrics.contrastEfficiency);
    inRange(metrics.lightnessLinearity);
    inRange(metrics.chromaSmoothness);
    inRange(metrics.hueStability);
    inRange(metrics.spacingUniformity);
  });

  it("score is a sane 0–100 value", () => {
    inRange(ramp.score, 0, 100);
    expect(ramp.score).toBeGreaterThan(0);
  });

  it("computes contrast spans", () => {
    expect(ramp.steps).toBe(18);
    expect(Number.isFinite(ramp.wcag[45].span)).toBe(true);
    expect(Number.isFinite(ramp.apca[60].span)).toBe(true);
  });
});

describe("Palette aggregation", () => {
  const palette = new Palette({ blue: BLUE_18, green: GREEN_18 });

  it("aggregates ramps and exposes colors", () => {
    expect(palette.ramps).toHaveLength(2);
    expect(palette.steps).toBe(18);
    expect(Object.keys(palette.colors)).toEqual(["blue", "green"]);
    expect(palette.colors.blue).toHaveLength(18);
  });

  it("aggregate metrics and score are finite and in range", () => {
    inRange(palette.contrastEfficiency);
    inRange(palette.lightnessLinearity);
    inRange(palette.chromaSmoothness);
    inRange(palette.hueStability);
    inRange(palette.spacingUniformity);
    inRange(palette.score, 0, 100);
  });
});
