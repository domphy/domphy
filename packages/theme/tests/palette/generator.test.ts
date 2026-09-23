import { describe, expect, it } from "vitest";
import { generateRamp, Ramp } from "../../src/index";

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

  it("normalizes the anchor for steps === 1 like the multi-step path", () => {
    expect(generateRamp("#FFF", 1)).toEqual(["#ffffff"]);
    expect(generateRamp("#4A7FF4", 1)).toEqual(["#4a7ff4"]);
    expect(generateRamp("#ff000080", 1)).toEqual(["#ff0000"]);
  });

  it("accepts shorthand anchors for steps > 1 without producing NaN", () => {
    const ramp = generateRamp("#fff", 3);
    expect(ramp).toHaveLength(3);
    ramp.forEach((hex) => expect(hex).toMatch(HEX_RE));
  });

  it("throws on an invalid anchor instead of emitting #NaNNaNNaN", () => {
    expect(() => generateRamp("#zzz", 18)).toThrow(/#zzz/);
    expect(() => generateRamp("#zzz", 1)).toThrow(/#zzz/);
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
    // Waypoints are pinned HARD at their own real luminance (constrained-
    // ladder solve, DESIGN.md §3.1) — the caller's array order must already
    // be compatible with (non-decreasing along) that real luminance, since
    // a later-position waypoint darker than an earlier one is a direct
    // contradiction of the tone system's monotonic-ramp guarantee, not
    // something a resample can silently paper over. #f7d774 (light) then
    // #1a2f6b (dark) is compatible; see the "throws" tests below for what
    // happens when it isn't.
    const ramp = generateRamp(["#f7d774", "#1a2f6b"], 18);
    expect(ramp).toHaveLength(18);
    ramp.forEach((hex) => expect(hex).toMatch(HEX_RE));
  });

  // Different hues (not merely different lightnesses) in luminance-
  // compatible order: input order is the intended waypoint sequence — the
  // generator does not resort by lightness — but it must already agree with
  // it, since each waypoint is pinned to its OWN real luminance.
  const MID_ANCHORS = ["#fefae0", "#2a9d8f", "#2a0708"] as const;

  it("round-trips each mid-anchor hex as a waypoint", () => {
    const ramp = generateRamp([...MID_ANCHORS], 18);
    for (const hex of MID_ANCHORS) {
      expect(ramp).toContain(hex);
    }
  });

  it("keeps waypoints in input order, not sorted by lightness", () => {
    const ramp = generateRamp([...MID_ANCHORS], 18);
    const indices = MID_ANCHORS.map((hex) => ramp.indexOf(hex));
    expect(indices.every((index) => index >= 0)).toBe(true);
    for (let i = 1; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]);
    }
  });

  // Truth source: WCAG 2.1 SC 1.4.3 relative luminance — #4a7ff4 and
  // #d8597d are both ~0.232 (near-identical, independently computed from the
  // WCAG formula, not the package's own code), so pinning them at DIFFERENT
  // ramp positions asks for a darker-positioned step to be exactly as light
  // as a lighter-positioned one: infeasible under strict monotonicity.
  it("throws naming the pair when waypoint order conflicts with the waypoints' own luminance", () => {
    expect(() => generateRamp(["#4a7ff4", "#d8597d"], 18)).toThrow(
      /#d8597d.+#4a7ff4|#4a7ff4.+#d8597d/,
    );
  });

  // Truth source: WCAG 2.1 SC 1.4.3 — #85260c (a dark rust), one of two
  // waypoints here, lands via the black-anchor-white arc-length placement
  // (Generator.ts's `sequentialInterpolator`) 10 steps from the black edge:
  // 1 full K=9 AA window. Its own relative luminance only contrasts 2.28:1
  // against pure black (independently computed from the WCAG formula) —
  // short of the 4.5:1 floor by more than resampling the FREE steps between
  // them can make up, since both ends of that window are pinned exactly:
  // the black edge always, and every multi-anchor waypoint.
  it("throws naming the pair when an anchor's own luminance can't clear AA against an edge it's one K-step window from", () => {
    expect(() => generateRamp(["#85260c", "#3949ff"], 18)).toThrow(
      /#85260c.+the black edge|the black edge.+#85260c/,
    );
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

  it("keeps relative luminance strictly non-increasing along the ramp (the tone-system guarantee)", () => {
    // The shift-N tone contract assumes index distance maps to contrast
    // distance: a later step is never lighter than an earlier one. Verified
    // across the hue circle because gamut clamping at the extremes is where
    // a regression would show up first.
    const hslToHex = (hue: number): string => {
      const chroma = 0.5; // s=1, l=0.5 — maximally saturated, the hardest case
      const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
      const sector = Math.floor(hue / 60) % 6;
      const [r, g, b] = [
        [chroma, x, 0],
        [x, chroma, 0],
        [0, chroma, x],
        [0, x, chroma],
        [x, 0, chroma],
        [chroma, 0, x],
      ][sector];
      return `#${[r, g, b]
        .map((v) =>
          Math.round(v * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
    };
    for (let hue = 0; hue < 360; hue += 15) {
      const anchor = hslToHex(hue);
      const ramp = new Ramp(generateRamp(anchor, 18), anchor);
      const luminances = ramp.swatches.map((swatch) => swatch.luminance);
      for (let i = 1; i < luminances.length; i++) {
        expect(luminances[i]).toBeLessThanOrEqual(luminances[i - 1] + 1e-12);
      }
    }
  });
});
