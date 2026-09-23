import { describe, expect, it } from "vitest";
import { generateRamp } from "../../src/index";

// Truth source: WCAG 2.1 SC 1.4.3 — contrast ratio = (L1 + 0.05) / (L2 + 0.05)
// with relative luminance L = 0.2126R + 0.7152G + 0.0722B over linearized
// sRGB (WCAG 2.1 "relative luminance" definition). Dependency-free
// re-implementation of the spec formula, not of the package's own code.
function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * srgbToLinear(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * srgbToLinear(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * srgbToLinear(parseInt(hex.slice(5, 7), 16))
  );
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const STEPS = 18;
// K_ideal = ceil(0.501 * (STEPS - 1)) = 9 — the tone model's shift-N/shift-N+9
// pairing (DESIGN.md §2.1, ToneAliases "text" = shift-9 over a shift-0 surface).
const AA_SPAN = 9;
// AA normal text, WCAG 2.1 SC 1.4.3.
const AA_RATIO = 4.5;
// The ladder's own identity: (Y+0.05) is geometric with r = 21^(-1/(STEPS-1)),
// so a K-step gap contrasts at exactly r^-K.
const LADDER_RATIO_AT_AA_SPAN = 21 ** (AA_SPAN / (STEPS - 1)); // ≈ 5.012
// Only 8-bit sRGB output quantization separates the emitted ramp from that
// identity: one channel LSB near the dark end is worth ~0.07 of ratio, so a
// 0.1 band is the quantization floor, not a tuned fudge. Widening it would
// let a real ladder regression through.
const QUANTIZATION_BAND = 0.1;

// A fixed warp in Oklab L cannot hold this across hues (Oklab L is not a
// function of relative luminance): before the luminance-ladder resampling,
// a 4096-color sweep of this same assertion failed for 22.78% of ramps,
// worst pair 3.22:1 (#00ff00). The hue sweep below is the cheap standing
// guard for that regression class.
describe("generateRamp WCAG AA span (WCAG 2.1 SC 1.4.3 contrast formula)", () => {
  it("every pair 9 steps apart clears 4.5:1, across the hue circle at full chroma", () => {
    for (let hue = 0; hue < 360; hue += 10) {
      // Maximally saturated sRGB at that hue (HSL s=1, l=0.5) — the hardest
      // case, where Oklab L and relative luminance diverge most.
      const sector = Math.floor(hue / 60) % 6;
      const x = 1 - Math.abs(((hue / 60) % 2) - 1);
      const [r, g, b] = [
        [1, x, 0],
        [x, 1, 0],
        [0, 1, x],
        [0, x, 1],
        [x, 0, 1],
        [1, 0, x],
      ][sector];
      const anchor = `#${[r, g, b]
        .map((v) =>
          Math.round(v * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;

      const ramp = generateRamp(anchor, STEPS);
      for (let i = 0; i + AA_SPAN < STEPS; i++) {
        expect(
          contrastRatio(ramp[i], ramp[i + AA_SPAN]),
          `${anchor}[${i}] vs [${i + AA_SPAN}] (${ramp[i]} vs ${ramp[i + AA_SPAN]})`,
        ).toBeGreaterThanOrEqual(AA_RATIO);
      }
    }
  });

  // Pure black/white never get a pin step (their nearest step IS the fixed
  // edge, see Generator.ts's `anchorIdx` edge-collision skip) — every one of
  // their K-step pairs is untouched by the constrained-ladder solve and
  // still lands on the pure closed-form ratio.
  it("lands on the ladder's closed-form ratio 21^(K/(N-1)) for un-pinned (edge) anchors", () => {
    for (const anchor of ["#000000", "#ffffff"]) {
      const ramp = generateRamp(anchor, STEPS);
      for (let i = 0; i + AA_SPAN < STEPS; i++) {
        expect(
          Math.abs(
            contrastRatio(ramp[i], ramp[i + AA_SPAN]) - LADDER_RATIO_AT_AA_SPAN,
          ),
          `${anchor}[${i}] vs [${i + AA_SPAN}]`,
        ).toBeLessThanOrEqual(QUANTIZATION_BAND);
      }
    }
  });

  // An anchor that DOES land on an interior step is now pinned (soft, for a
  // single anchor — the former anchor-fidelity debt item) to its own real
  // luminance instead of the pure ladder value there, so the
  // constrained-ladder solve (Generator.ts's `solveConstrainedLadder`) can
  // pull nearby K-step pairs off 21^(K/(N-1)) to honor that pin — trading
  // ratio-uniformity for fidelity, which is the whole point of the fix.
  // MEASURED worst-case deviation across the full hue circle at full chroma
  // (generatorContrast's own hue-sweep, the hardest case) is 2.25 (#00ff00);
  // this bounds a real regression (e.g. the solve failing to converge to
  // ANY sane ladder) without re-imposing the exactness the fidelity fix
  // deliberately relaxes. The hard AA floor itself is the test above this
  // one ("every pair 9 steps apart clears 4.5:1"), not this bound.
  const MAX_FIDELITY_PULL_DEVIATION = 2.5;

  it("an anchor's own luminance can pull a K-step pair off the pure ladder ratio, within a bound", () => {
    for (const anchor of [
      "#4a7ff4",
      "#00ff00",
      "#ffeb3b",
      "#22c55e",
      "#fef3c7",
    ]) {
      const ramp = generateRamp(anchor, STEPS);
      for (let i = 0; i + AA_SPAN < STEPS; i++) {
        expect(
          Math.abs(
            contrastRatio(ramp[i], ramp[i + AA_SPAN]) - LADDER_RATIO_AT_AA_SPAN,
          ),
          `${anchor}[${i}] vs [${i + AA_SPAN}]`,
        ).toBeLessThanOrEqual(MAX_FIDELITY_PULL_DEVIATION);
      }
    }
  });

  it("9 is the MINIMAL AA span — an 8-step gap is below 4.5:1 by construction", () => {
    // r^-8 = 21^(8/17) ≈ 4.19 < 4.5. If an 8-gap cleared AA the ramp would be
    // wasting contrast range, and K_ideal would no longer be 9.
    const ramp = generateRamp("#4a7ff4", STEPS);
    for (let i = 0; i + 8 < STEPS; i++) {
      expect(contrastRatio(ramp[i], ramp[i + 8])).toBeLessThan(AA_RATIO);
    }
  });
});
