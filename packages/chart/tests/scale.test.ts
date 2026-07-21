import { describe, expect, it } from "vitest";
import {
  createLinearScale,
  createLogScale,
  createOrdinalScale,
  createTimeScale,
} from "../src/index.ts";

describe("createLinearScale", () => {
  it("maps domain to range linearly and inverts back", () => {
    const scale = createLinearScale([0, 100], [0, 200]);
    expect(scale.map(0)).toBe(0);
    expect(scale.map(100)).toBe(200);
    expect(scale.map(50)).toBe(100);
    expect(scale.invert(100)).toBe(50);
    expect(scale.invert(scale.map(37))).toBeCloseTo(37);
  });

  it("supports a reversed pixel range (e.g. y-axis flip)", () => {
    const scale = createLinearScale([0, 10], [300, 0]);
    expect(scale.map(0)).toBe(300);
    expect(scale.map(10)).toBe(0);
    expect(scale.map(5)).toBe(150);
  });

  it("does not divide by zero when domain collapses to a point", () => {
    const scale = createLinearScale([5, 5], [0, 100]);
    expect(Number.isFinite(scale.map(5))).toBe(true);
    expect(scale.ticks()).toEqual([5]);
  });

  it("produces ascending, evenly-steppable nice ticks", () => {
    const scale = createLinearScale([0, 100], [0, 200]);
    const ticks = scale.ticks(5);
    expect(ticks).toEqual([0, 20, 40, 60, 80, 100]);
    for (let i = 1; i < ticks.length; i++)
      expect(ticks[i]).toBeGreaterThan(ticks[i - 1]);
  });

  it("bandwidth is always zero (continuous scale)", () => {
    expect(createLinearScale([0, 1], [0, 1]).bandwidth()).toBe(0);
  });

  it("formats large numbers with K/M suffixes and trims trailing zeros", () => {
    const scale = createLinearScale([0, 1], [0, 1]);
    expect(scale.format(42)).toBe("42");
    expect(scale.format(1234)).toBe("1.23K");
    expect(scale.format(1500000)).toBe("1.50M");
    expect(scale.format(0.1)).toBe("0.1");
  });
});

describe("createLogScale", () => {
  it("maps domain to range logarithmically and inverts back", () => {
    const scale = createLogScale([1, 1000], [0, 300]);
    expect(scale.map(1)).toBeCloseTo(0);
    expect(scale.map(1000)).toBeCloseTo(300);
    expect(scale.map(10)).toBeCloseTo(100);
    expect(scale.invert(scale.map(42))).toBeCloseTo(42, 5);
  });

  it("places whole-power-of-base ticks within the domain", () => {
    const scale = createLogScale([1, 1000], [0, 300]);
    expect(scale.ticks()).toEqual([1, 10, 100]);
  });

  it("supports a custom base", () => {
    const scale = createLogScale([1, 8], [0, 300], 2);
    expect(scale.base).toBe(2);
    expect(scale.map(1)).toBeCloseTo(0);
    expect(scale.map(8)).toBeCloseTo(300);
    expect(scale.format(4)).toBe("2^2");
  });

  it("bandwidth is always zero (continuous scale)", () => {
    expect(createLogScale([1, 10], [0, 100]).bandwidth()).toBe(0);
  });
});

describe("createOrdinalScale", () => {
  it("centers each category in its own band", () => {
    const scale = createOrdinalScale(["A", "B", "C"], [0, 300]);
    // step = 100 per category, band center at step/2, 1.5*step, 2.5*step
    expect(scale.map("A")).toBeCloseTo(50);
    expect(scale.map("B")).toBeCloseTo(150);
    expect(scale.map("C")).toBeCloseTo(250);
  });

  it("shrinks the bandwidth by the padding fraction", () => {
    const scale = createOrdinalScale(["A", "B"], [0, 200], 0.5);
    // step = 100, innerWidth = 100 * (1 - 0.5) = 50
    expect(scale.bandwidth()).toBeCloseTo(50);
  });

  it("inverts a pixel back to the enclosing category", () => {
    const scale = createOrdinalScale(["A", "B", "C"], [0, 300]);
    expect(scale.invert(10)).toBe("A");
    expect(scale.invert(150)).toBe("B");
    expect(scale.invert(299)).toBe("C");
  });

  it("falls back to the range start for an unknown category", () => {
    const scale = createOrdinalScale(["A", "B"], [0, 200]);
    expect(scale.map("nope")).toBe(0);
  });

  it("ticks() returns the domain verbatim", () => {
    const scale = createOrdinalScale(["A", "B"], [0, 100]);
    expect(scale.ticks()).toEqual(["A", "B"]);
  });
});

describe("createTimeScale", () => {
  const domain: [string, string] = [
    "2024-01-01T00:00:00Z",
    "2024-01-05T00:00:00Z",
  ];

  it("maps domain endpoints to range endpoints and inverts back", () => {
    const scale = createTimeScale(domain, [0, 400]);
    expect(scale.map(domain[0])).toBeCloseTo(0);
    expect(scale.map(domain[1])).toBeCloseTo(400);
    const mid = scale.invert(200);
    const expectedMid = new Date(domain[0]).getTime() + 2 * 86400000;
    expect(Math.abs(mid.getTime() - expectedMid)).toBeLessThan(1000);
  });

  it("produces ascending ticks that stay within (a small margin of) the domain", () => {
    const scale = createTimeScale(domain, [0, 400]);
    const ticks = scale.ticks(5);
    expect(ticks.length).toBeGreaterThan(0);
    const dayMs = 86400000;
    for (const tick of ticks) {
      expect(tick.getTime()).toBeGreaterThanOrEqual(
        new Date(domain[0]).getTime() - dayMs,
      );
      expect(tick.getTime()).toBeLessThanOrEqual(
        new Date(domain[1]).getTime() + dayMs,
      );
    }
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].getTime()).toBeGreaterThan(ticks[i - 1].getTime());
    }
  });

  it("bandwidth is always zero (continuous scale)", () => {
    expect(createTimeScale(domain, [0, 100]).bandwidth()).toBe(0);
  });

  it("accepts Date instances and numeric timestamps, not just strings", () => {
    const start = new Date(domain[0]);
    const end = new Date(domain[1]);
    const scale = createTimeScale([start, end], [0, 100]);
    expect(scale.map(start.getTime())).toBeCloseTo(0);
    expect(scale.map(end)).toBeCloseTo(100);
  });
});
