import { describe, expect, it } from "vitest";
import { generateRamp } from "../src/index";

const HEX = /^#[0-9a-f]{6}$/;

describe("generateRamp", () => {
  it("returns the requested number of hex strings from one anchor", () => {
    const ramp = generateRamp(["#3b82f6"], 18);
    expect(ramp).toHaveLength(18);
    for (const hex of ramp) {
      expect(hex).toMatch(HEX);
    }
  });

  it("accepts a single hex string and multiple anchors", () => {
    expect(generateRamp("#3b82f6", 11)).toHaveLength(11);
    expect(generateRamp(["#fef3c7", "#f59e0b", "#7c2d12"], 9)).toHaveLength(9);
  });

  it("handles edge counts", () => {
    expect(generateRamp("#3b82f6", 0)).toEqual([]);
    expect(generateRamp("#3b82f6", 1)).toEqual(["#3b82f6"]);
  });

  it("is deterministic", () => {
    expect(generateRamp("#3b82f6", 18)).toEqual(generateRamp("#3b82f6", 18));
  });
});
