import { describe, expect, it } from "vitest";
import { calcDeltaE2000, hexToRgb, rgbToLab } from "../../src/index";

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

// Sharma, Wu & Dalal (2005), Table I — official CIEDE2000 fixtures.
// Columns: L1 a1 b1  L2 a2 b2  ΔE00. Pairs 7–8 are the achromatic
// (C′=0) branch; pairs 9–16 exercise the h̄ wrap when |h1′−h2′| > 180°.
const SHARMA_PAIRS: Array<{
  lab1: [number, number, number];
  lab2: [number, number, number];
  deltaE: number;
}> = [
  { lab1: [50.0, 2.6772, -79.7751], lab2: [50.0, 0.0, -82.7485], deltaE: 2.0425 },
  { lab1: [50.0, 3.1571, -77.2803], lab2: [50.0, 0.0, -82.7485], deltaE: 2.8615 },
  { lab1: [50.0, 2.8361, -74.02], lab2: [50.0, 0.0, -82.7485], deltaE: 3.4412 },
  { lab1: [50.0, -1.3802, -84.2814], lab2: [50.0, 0.0, -82.7485], deltaE: 1.0 },
  { lab1: [50.0, -1.1848, -84.8006], lab2: [50.0, 0.0, -82.7485], deltaE: 1.0 },
  { lab1: [50.0, -0.9009, -85.5211], lab2: [50.0, 0.0, -82.7485], deltaE: 1.0 },
  { lab1: [50.0, 0.0, 0.0], lab2: [50.0, -1.0, 2.0], deltaE: 2.3669 },
  { lab1: [50.0, -1.0, 2.0], lab2: [50.0, 0.0, 0.0], deltaE: 2.3669 },
  { lab1: [50.0, 2.49, -0.001], lab2: [50.0, -2.49, 0.0009], deltaE: 7.1792 },
  { lab1: [50.0, 2.49, -0.001], lab2: [50.0, -2.49, 0.001], deltaE: 7.1792 },
  { lab1: [50.0, 2.49, -0.001], lab2: [50.0, -2.49, 0.0011], deltaE: 7.2195 },
  { lab1: [50.0, 2.49, -0.001], lab2: [50.0, -2.49, 0.0012], deltaE: 7.2195 },
  { lab1: [50.0, -0.001, 2.49], lab2: [50.0, 0.0009, -2.49], deltaE: 4.8045 },
  { lab1: [50.0, -0.001, 2.49], lab2: [50.0, 0.001, -2.49], deltaE: 4.8045 },
  { lab1: [50.0, -0.001, 2.49], lab2: [50.0, 0.0011, -2.49], deltaE: 4.7461 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 0.0, -2.5], deltaE: 4.3065 },
  { lab1: [50.0, 2.5, 0.0], lab2: [73.0, 25.0, -18.0], deltaE: 27.1492 },
  { lab1: [50.0, 2.5, 0.0], lab2: [61.0, -5.0, 29.0], deltaE: 22.8977 },
  { lab1: [50.0, 2.5, 0.0], lab2: [56.0, -27.0, -3.0], deltaE: 31.903 },
  { lab1: [50.0, 2.5, 0.0], lab2: [58.0, 24.0, 15.0], deltaE: 19.4535 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 3.1736, 0.5854], deltaE: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 3.2972, 0.0], deltaE: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 1.8634, 0.5757], deltaE: 1.0 },
  { lab1: [50.0, 2.5, 0.0], lab2: [50.0, 3.2592, 0.335], deltaE: 1.0 },
  { lab1: [60.2574, -34.0099, 36.2677], lab2: [60.4626, -34.1751, 39.4387], deltaE: 1.2644 },
  { lab1: [63.0109, -31.0961, -5.8663], lab2: [62.8187, -29.7946, -4.0864], deltaE: 1.263 },
  { lab1: [61.2901, 3.7196, -5.3901], lab2: [61.4292, 2.248, -4.962], deltaE: 1.8731 },
  { lab1: [35.0831, -44.1164, 3.7933], lab2: [35.0232, -40.0716, 1.5901], deltaE: 1.8645 },
  { lab1: [22.7233, 20.0904, -46.694], lab2: [23.0331, 14.973, -42.5619], deltaE: 2.0373 },
  { lab1: [36.4612, 47.858, 18.3852], lab2: [36.2715, 50.5065, 21.2231], deltaE: 1.4146 },
  { lab1: [90.8027, -2.0831, 1.441], lab2: [91.1528, -1.6435, 0.0447], deltaE: 1.4441 },
  { lab1: [90.9257, -0.5406, -0.9208], lab2: [88.6381, -0.8985, -0.7239], deltaE: 1.5381 },
  { lab1: [6.7747, -0.2908, -2.4247], lab2: [5.8714, -0.0985, -2.2286], deltaE: 0.6377 },
  { lab1: [2.0776, 0.0795, -1.135], lab2: [0.9033, -0.0636, -0.5514], deltaE: 0.9082 },
];

describe("calcDeltaE2000 Sharma fixtures", () => {
  it("matches every Sharma 2005 Table I pair to 4 decimal places", () => {
    for (const { lab1, lab2, deltaE } of SHARMA_PAIRS) {
      expect(calcDeltaE2000(lab1, lab2)).toBeCloseTo(deltaE, 4);
    }
  });

  it("uses the achromatic (C′=0) branch for a true gray vs a near-neutral", () => {
    // Sharma pair 7: one sample is Lab (50, 0, 0) — C′ = 0 so Δh′ = 0
    // and h̄′ = h1′ + h2′ (the chromatic sample's hue).
    expect(calcDeltaE2000([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 4);
  });

  it("uses the h̄ wrap when |h1′ − h2′| > 180°", () => {
    // Sharma pair 9: hues sit on opposite sides of the 0°/360° cut.
    expect(calcDeltaE2000([50, 2.49, -0.001], [50, -2.49, 0.0009])).toBeCloseTo(
      7.1792,
      4,
    );
  });
});
