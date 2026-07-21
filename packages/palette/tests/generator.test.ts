import { describe, expect, it } from "vitest";
import { generateRamp, Ramp } from "../src/index";

const HEX_RE = /^#[0-9a-f]{6}$/i;

describe("generateRamp", () => {
  it("returns the requested number of valid hex steps", () => {
    const ramp = generateRamp("#4a7ff4", 18);
    expect(ramp).toHaveLength(18);
    ramp.forEach((hex) => expect(hex).toMatch(HEX_RE));
  });

  it("orders light-to-dark, matching @domphy/theme's ThemeInput convention", () => {
    const ramp = generateRamp("#4a7ff4", 18);
    expect(ramp[0].toLowerCase()).toBe("#ffffff");
    expect(ramp[ramp.length - 1].toLowerCase()).toBe("#000000");
  });

  it("handles degenerate step counts", () => {
    expect(generateRamp("#4a7ff4", 0)).toEqual([]);
    expect(generateRamp("#4a7ff4", 1)).toEqual(["#4a7ff4"]);
  });

  it("throws instead of producing undefined entries for an empty anchor list", () => {
    expect(() => generateRamp([], 1)).toThrow(
      "generateRamp requires at least one anchor color",
    );
    expect(() => generateRamp([], 18)).toThrow(
      "generateRamp requires at least one anchor color",
    );
  });

  it("accepts multiple anchor colors as fixed waypoints", () => {
    const ramp = generateRamp(["#4a7ff4", "#d8597d"], 18);
    expect(ramp).toHaveLength(18);
    ramp.forEach((hex) => expect(hex).toMatch(HEX_RE));
  });

  // The generator's whole purpose is to make the Ramp evaluator (Ramp.ts,
  // ported from the chromametry paper) score well — this is the end-to-end
  // proof that the warp/unwarp tuning actually achieves its target.
  it("produces a ramp the evaluator scores highly", () => {
    for (const hex of ["#4a7ff4", "#22c55e", "#e8b923", "#d8597d", "#16a4d5"]) {
      const ramp = new Ramp(generateRamp(hex, 18), hex);
      expect(ramp.score).toBeGreaterThan(75);
      // Contrast efficiency is the metric the warp curve directly targets.
      expect(ramp.contrastEfficiency).toBeGreaterThan(0.7);
    }
  });

  it("keeps the observed WCAG 4.5:1 span close to the theoretical ideal (K_ideal = ceil(0.501 * 17) = 9)", () => {
    const ramp = new Ramp(generateRamp("#4a7ff4", 18), "brand");
    expect(ramp.wcag[45].span).toBeLessThanOrEqual(10);
  });
});
