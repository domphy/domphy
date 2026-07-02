import { describe, expect, it } from "vitest";
import { resolvePolar } from "../src/coord/polar.ts";
import type { AngleAxisOption, PolarOption, RadiusAxisOption } from "../src/types.ts";

describe("resolvePolar", () => {
  it("centers on the container and sizes the radius from the smaller dimension by default", () => {
    const coord = resolvePolar({}, { type: "value" }, { type: "value" }, [], 400, 300);
    expect(coord.center).toEqual([200, 150]);
    expect(coord.innerRadius).toBe(0);
    expect(coord.outerRadius).toBeCloseTo(300 * 0.4);
  });

  it("resolves percentage-based center and radius against the container", () => {
    const polar: PolarOption = { center: ["50%", "50%"], radius: ["20%", "80%"] };
    const coord = resolvePolar(polar, { type: "value" }, { type: "value" }, [], 400, 200);
    expect(coord.center).toEqual([200, 100]);
    // minSize = min(400, 200) = 200
    expect(coord.innerRadius).toBeCloseTo(40);
    expect(coord.outerRadius).toBeCloseTo(160);
  });

  it("maps a linear value angle axis across a full 360° sweep from startAngle", () => {
    const angleAxis: AngleAxisOption = { type: "value", min: 0, max: 360 };
    const coord = resolvePolar({}, angleAxis, { type: "value" }, [], 400, 400);
    expect(coord.angleScale.map(0)).toBeCloseTo(90);
    expect(coord.angleScale.map(360)).toBeCloseTo(450);
  });

  it("reverses sweep direction when clockwise is false", () => {
    const angleAxis: AngleAxisOption = { type: "value", min: 0, max: 360, clockwise: false };
    const coord = resolvePolar({}, angleAxis, { type: "value" }, [], 400, 400);
    expect(coord.angleScale.map(0)).toBeCloseTo(90);
    expect(coord.angleScale.map(360)).toBeCloseTo(90 - 360);
  });

  it("builds a category angle scale that bands the categories across the sweep", () => {
    const angleAxis: AngleAxisOption = { type: "category", data: ["A", "B", "C"] };
    const coord = resolvePolar({}, angleAxis, { type: "value" }, [], 400, 400);
    expect(coord.angleScale.type).toBe("ordinal");
    expect(coord.angleScale.domain).toEqual(["A", "B", "C"]);
  });

  it("derives the radius scale's max from series data, floored at a 0 baseline", () => {
    // resolvePolar seeds the extent at [0, 1] (radial series read as a
    // from-center bar length, unlike the cartesian grid's data-min/max
    // extent), so a positive-only series never pushes the floor above 0.
    const radiusAxis: RadiusAxisOption = { type: "value" };
    const series = [{ data: [5, 15, 10] }];
    const coord = resolvePolar({}, { type: "value" }, radiusAxis, series, 400, 400);
    expect(coord.radiusScale.domain).toEqual([0, 15]);
  });

  it("falls back to a [0, 1] radius extent when there is no series data", () => {
    const coord = resolvePolar({}, { type: "value" }, { type: "value" }, [], 400, 400);
    expect(coord.radiusScale.domain).toEqual([0, 1]);
  });

  it("builds a category radius scale from radiusAxis.data", () => {
    const radiusAxis: RadiusAxisOption = { type: "category", data: ["Low", "Mid", "High"] };
    const coord = resolvePolar({}, { type: "value" }, radiusAxis, [], 400, 400);
    expect(coord.radiusScale.type).toBe("ordinal");
    expect(coord.radiusScale.domain).toEqual(["Low", "Mid", "High"]);
  });
});
