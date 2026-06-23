import { describe, expect, it } from "vitest";
import { calcDeltaE2000, hexToRgb, rgbToLab } from "../src/index";

const lab = (hex: string) => rgbToLab(hexToRgb(hex));

// Characterization tests: these lock the CURRENT CIEDE2000 output so future
// refactors cannot silently change the published benchmark scores. The numbers
// were captured from the implementation, not derived from an external oracle.
describe("calcDeltaE2000 (characterization)", () => {
  it("returns 0 for an identical pair", () => {
    const gray = lab("#808080");
    expect(calcDeltaE2000(gray, gray)).toBe(0);
  });

  it("locks the achromatic (gray vs gray) pair value", () => {
    const a = lab("#808080");
    const b = lab("#c0c0c0");
    expect(calcDeltaE2000(a, b)).toBeCloseTo(19.6791, 3);
  });

  it("locks a chromatic (blue vs red) pair value", () => {
    const blue = lab("#3b82f6");
    const red = lab("#ef4444");
    expect(calcDeltaE2000(blue, red)).toBeCloseTo(45.4168, 3);
  });

  it("locks a near-hue (blue vs darker blue) pair value", () => {
    const blue = lab("#3b82f6");
    const darkerBlue = lab("#2f6bd4");
    expect(calcDeltaE2000(blue, darkerBlue)).toBeCloseTo(9.0908, 3);
  });

  it("is symmetric for a chromatic pair", () => {
    const blue = lab("#3b82f6");
    const red = lab("#ef4444");
    expect(calcDeltaE2000(blue, red)).toBeCloseTo(calcDeltaE2000(red, blue), 6);
  });
});
