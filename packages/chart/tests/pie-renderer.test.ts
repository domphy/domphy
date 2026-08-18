import { describe, expect, it } from "vitest";
import {
  angleInPieSlice,
  computePieSlices,
} from "../src/gl/PieRenderer.ts";

describe("computePieSlices", () => {
  const data = [
    { name: "A", value: 1 },
    { name: "B", value: 1 },
  ];

  it("starts at 12 o'clock (ECharts 90°) by default and sweeps clockwise", () => {
    const slices = computePieSlices(
      { type: "pie", data } as any,
      200,
      200,
    );
    expect(slices[0].startAngle).toBeCloseTo(-Math.PI / 2);
    expect(slices[0].endAngle).toBeCloseTo(Math.PI / 2);
    expect(slices[1].endAngle).toBeCloseTo((3 * Math.PI) / 2);
  });

  it("honors startAngle (0 = 3 o'clock in screen space)", () => {
    const slices = computePieSlices(
      { type: "pie", startAngle: 0, data } as any,
      200,
      200,
    );
    expect(slices[0].startAngle).toBeCloseTo(0);
    expect(slices[0].endAngle).toBeCloseTo(Math.PI);
  });

  it("reverses sweep when clockwise is false", () => {
    const slices = computePieSlices(
      { type: "pie", clockwise: false, data } as any,
      200,
      200,
    );
    expect(slices[0].startAngle).toBeCloseTo(-Math.PI / 2);
    expect(slices[0].endAngle).toBeCloseTo(-Math.PI / 2 - Math.PI);
    expect(slices[1].endAngle).toBeCloseTo(-Math.PI / 2 - Math.PI * 2);
  });

  it("treats a cursor on the right half as the first default slice", () => {
    const slices = computePieSlices({ type: "pie", data } as any, 400, 300);
    expect(slices[0].cx).toBe(200);
    expect(slices[0].cy).toBe(150);
    const cursor = Math.atan2(150 - slices[0].cy, 250 - slices[0].cx);
    expect(
      angleInPieSlice(cursor, slices[0].startAngle, slices[0].endAngle),
    ).toBe(true);
  });

  it("drops legend-hidden slices and rescales the remainder to a full turn", () => {
    const slices = computePieSlices(
      { type: "pie", data } as any,
      200,
      200,
      new Set(["A"]),
    );
    expect(slices).toHaveLength(1);
    expect(slices[0].item.name).toBe("B");
    expect(slices[0].fraction).toBeCloseTo(1);
    expect(slices[0].endAngle - slices[0].startAngle).toBeCloseTo(Math.PI * 2);
  });
});
