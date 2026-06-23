import { describe, expect, it } from "vitest";
import { Swatch, toLightnessEAL } from "../src/index";

describe("Swatch known values", () => {
  const swatch = new Swatch("#3b82f6");

  it("lightness equals toLightnessEAL(lab) after delegation", () => {
    expect(swatch.lightness).toBe(toLightnessEAL(swatch.lab));
    expect(swatch.lightness).toBeCloseTo(73.2291, 3);
  });

  it("luminance is the Rec.709 weighted linear RGB sum", () => {
    const [r, g, b] = swatch.rgb;
    expect(swatch.luminance).toBeCloseTo(
      0.2126 * r + 0.7152 * g + 0.0722 * b,
      9,
    );
    expect(swatch.luminance).toBeCloseTo(0.2355, 3);
  });

  it("lch chroma and hue match the captured values", () => {
    expect(swatch.lch[0]).toBeCloseTo(55.6302, 3);
    expect(swatch.chroma).toBeCloseTo(66.7668, 3);
    expect(swatch.hue).toBeCloseTo(285.2316, 3);
    // chroma/hue are convenience accessors for lch[1]/lch[2].
    expect(swatch.chroma).toBe(swatch.lch[1]);
    expect(swatch.hue).toBe(swatch.lch[2]);
  });

  it("pure white and black collapse chroma to zero", () => {
    expect(new Swatch("#ffffff").chroma).toBeCloseTo(0, 3);
    expect(new Swatch("#000000").chroma).toBeCloseTo(0, 3);
  });
});
