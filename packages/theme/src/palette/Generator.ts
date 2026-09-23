import { CONTRAST_EFFICIENCY_LAMBDA } from "./Ramp.js";
import {
  createMonotone,
  hexToRgb,
  oklabToRgb,
  rgbToHex,
  rgbToOklab,
} from "./utils.js";

/**
 * Rational-function warp/unwarp pair used to bend the ramp's interpolation
 * parameter so that, once sliced into N discrete steps, the resulting WCAG
 * contrast pairs land as close as possible to the theoretically ideal
 * contrast span K_ideal = ceil(0.501 * (N - 1)) (see the Contrast Efficiency
 * metric in Ramp.ts / the chromametry paper). P and Q were fit by grid search
 * + local refinement against 600 synthetic base colors sampled from the
 * hardest hue regions for perceptual uniformity (green, blue-green/cyan),
 * jointly optimizing the composite quality SCORE and how often the generated
 * ramp's actual span matches K_ideal exactly. At P=0.605, Q=0.685 the search
 * converged to ~90.6 average SCORE, ~95.9% of ramps with span <= K_ideal, and
 * ~88.5% exact span match.
 *
 * Those span figures describe the warp ALONE, which is no longer what sets a
 * ramp's lightness: `luminanceLadder` below computes the closed-form
 * unconstrained target, and `solveConstrainedLadder` resamples it — pinning
 * each anchor's own real luminance and enforcing the WCAG floor on every
 * ramp-wide pair, single- or multi-anchor alike (the same sweep measured
 * 22.78% AA failures under the warp on its own). The warp still shapes the
 * hue/chroma path every ramp samples along.
 */
const P = 0.605;
const Q = 0.685;

function warp(t: number): number {
  const tn = t ** P;
  return tn / (1 + Q * (1 - tn));
}

function unwarp(y: number): number {
  const xn = (y * (1 + Q)) / (1 + y * Q);
  return xn ** (1 / P);
}

// WCAG 2.x relative luminance from LINEAR RGB (what the interpolator emits):
// Y = 0.2126R + 0.7152G + 0.0722B, Rec.709 coefficients. Same formula as
// Swatch.luminance, clamped to [0,1] first so it agrees with the 8-bit hex
// rgbToHex() actually produces (the Oklab path can overshoot the sRGB gamut).
function relativeLuminance(rgb: number[]): number {
  const clamp = (c: number) => (c < 0 ? 0 : c > 1 ? 1 : c);
  return (
    0.2126 * clamp(rgb[0]) + 0.7152 * clamp(rgb[1]) + 0.0722 * clamp(rgb[2])
  );
}

// White-to-black WCAG ratio: (1 + 0.05) / (0 + 0.05).
const WHITE_BLACK_CONTRAST = 21;

/**
 * Target relative luminances, darkest first, spaced so `(Y + 0.05)` is
 * geometric across the ramp:
 *
 *   Y_i + 0.05 = 1.05 · r^i,   r = 21^(-1/(stepsCount - 1))
 *
 * WCAG contrast is `(Y_hi + 0.05) / (Y_lo + 0.05)`, so any two steps K apart
 * then contrast at exactly `r^-K` — independent of hue. For stepsCount = 18:
 * K = 9 → 5.01:1 (clears AA 4.5:1) and K = 8 → 4.19:1 (does not), i.e. 9 is
 * the exact minimal AA span, matching K_ideal = ceil(0.501 · 17) = 9.
 *
 * This is the part a warp in Oklab L cannot do: WCAG contrast depends on Y
 * alone, and Oklab L is not a function of Y, so one fixed curve cannot hold
 * the span across hues. Measured over a 4096-color sweep, the pre-ladder warp
 * missed the K=9 AA contract for 22.78% of ramps (worst pair 3.22:1 at
 * #00ff00). Re-sampling the SAME curve at these luminances keeps its hue and
 * chroma path and fixes only the lightness ladder.
 */
function luminanceLadder(stepsCount: number): number[] {
  const ratio = WHITE_BLACK_CONTRAST ** (-1 / (stepsCount - 1));
  const ladder: number[] = [];
  for (let i = stepsCount - 1; i >= 0; i--) {
    ladder.push(1.05 * ratio ** i - 0.05);
  }
  return ladder;
}

// DERIVED: same `K_ideal = ceil(LAMBDA * (steps - 1))` formula Ramp.ts's
// `contrastEfficiency` scores an existing ramp against (DESIGN.md §2.1) — the
// number of steps apart a pair must be for `luminanceLadder`'s exact-geometric
// span to clear WCAG AA. Re-derived here (not read off `luminanceLadder`'s
// own construction) so a caller-supplied `stepsCount` other than 18 still
// gets the right window.
function idealSpanK(stepsCount: number): number {
  return Math.ceil(CONTRAST_EFFICIENCY_LAMBDA * (stepsCount - 1));
}

// WCAG 2.1 SC 1.4.3 normal-text AA threshold — contract tolerance, the
// problem's own definition, never tuned.
const AA_CONTRAST_RATIO = 4.5;

// MEASURED: generatorContrast.test.ts's QUANTIZATION_BAND derivation found a
// single 8-bit output channel near the dark end of the ramp is worth ~0.07
// of contrast ratio. A constraint that binds at EXACTLY 4.5:1 in the
// real-valued solve below can land a hair under 4.5:1 once rounded to a hex
// triplet; enforcing 4.5 + this margin in the solver keeps the rounded
// output clear of the floor.
const WCAG_QUANTIZATION_MARGIN = 0.07;

// The WCAG floor's log-gap form (see `logGap` below): every K-apart pair
// must satisfy `z_hi - z_lo >= WCAG_LOG_FLOOR`.
const WCAG_LOG_FLOOR = Math.log(AA_CONTRAST_RATIO + WCAG_QUANTIZATION_MARGIN);

// MEASURED: a monotonicity constraint of EXACTLY `Y_hi >= Y_lo` (minGap 0)
// lets the solve place two ADJACENT steps' targets arbitrarily close
// together when a pin nearby forces a tight fit — realizing two such targets
// as actual hex colors (`resampleCurveAtLuminance` independently finds each
// step's own closest achievable match) can then round to the WRONG relative
// order. 30000 random 1-3 anchor combinations (plus a full-saturation hue x
// hue sweep, the traditionally hardest case) with minGap = 0 found a worst
// adjacent-pair ratio of 0.9955:1 in the WRONG direction — a 0.45% deficit —
// for multi-anchor `["#90d941", "#93d3a1"]`. This floor requires 2% between
// any two adjacent steps, a >4x margin over that measured worst case, while
// staying far below the unconstrained ladder's own natural adjacent-step
// ratio (`21^(1/17)` ≈ 1.19:1 at N=18) — so it only prevents the solve from
// collapsing steps under pin pressure, it does not perceptibly change an
// unconstrained ramp.
const MONOTONE_LOG_MARGIN = Math.log(1.02);

// `(Y + 0.05)` is what WCAG contrast ratios are; working in its log turns
// both the monotonicity constraint (Y increasing <=> z increasing) and the
// K-apart contrast floor (ratio >= R <=> z_hi - z_lo >= ln R) into LINEAR
// constraints on z, which is what makes the constrained ladder below a
// convex (quadratic objective, linear constraints) problem instead of one
// over a WCAG ratio's nonlinear rational form.
function logGap(luminance: number): number {
  return Math.log(luminance + 0.05);
}

function expGap(logLuminance: number): number {
  return Math.exp(logLuminance) - 0.05;
}

// Two coordinates fixed relative to each other by `minGap` (monotonicity:
// minGap = MONOTONE_LOG_MARGIN; the WCAG floor: minGap = WCAG_LOG_FLOOR), or
// one coordinate pinned outright (an anchor's own luminance, or the
// near-white/near-black edge) — the two constraint shapes
// `solveConstrainedLadder` projects onto.
type GapConstraint = { low: number; high: number; minGap: number };

// DERIVED: the projection is judged converged once a full sweep over every
// constraint moves no coordinate by more than this. 1e-10 sits many orders
// below the ~0.0039 (1/255) step an 8-bit hex channel can even represent, so
// it cannot affect the emitted output.
const PROJECTION_CONVERGENCE_TOLERANCE = 1e-10;

// Safety cap, not a tuned knob: this QP has at most a few dozen coordinates
// and a few dozen halfspace constraints (18-step ramp: 17 monotonicity pairs
// + ~9 WCAG pairs + a handful of fixed points), and Dykstra's algorithm
// converges to that tolerance in well under a hundred sweeps for a problem
// this small in practice. Hitting the cap throws — it means the solve
// genuinely failed to converge, not that it should silently return a
// half-solved ladder.
const MAX_PROJECTION_ITERATIONS = 2000;

/**
 * Euclidean-nearest point (in log-luminance space) to `idealZ` that respects
 * every constraint in `constraints` — Dykstra's alternating-projection
 * algorithm (Boyle & Dykstra, "An L2 algorithm for singular linear
 * inequality systems", 1986). Exact in the limit for an intersection of
 * convex sets; every constraint here is a halfspace (or, `low === high`, a
 * fixed point) touching one or two coordinates, so each projection is
 * closed-form — no matrix inversion, no external QP dependency.
 *
 * Each halfspace `{z : z[high] - z[low] >= minGap}` projects a violating
 * point by moving `low` and `high` equally and oppositely (the halfspace's
 * normal is `e_high - e_low`, norm² = 2, so the standard point-to-halfspace
 * projection formula splits the correction in half either way).
 */
function solveConstrainedLadder(
  idealZ: number[],
  constraints: GapConstraint[],
): number[] {
  const project = (z: number[], constraint: GapConstraint): number[] => {
    if (constraint.low === constraint.high) {
      // Fixed point: `minGap` is the pinned value itself.
      if (z[constraint.low] === constraint.minGap) return z;
      const next = z.slice();
      next[constraint.low] = constraint.minGap;
      return next;
    }
    const gap = z[constraint.high] - z[constraint.low];
    if (gap >= constraint.minGap) return z;
    const correction = (constraint.minGap - gap) / 2;
    const next = z.slice();
    next[constraint.low] -= correction;
    next[constraint.high] += correction;
    return next;
  };

  let z = idealZ.slice();
  const increments = constraints.map(() => new Array(idealZ.length).fill(0));

  for (let iteration = 0; iteration < MAX_PROJECTION_ITERATIONS; iteration++) {
    let maxChange = 0;
    for (let c = 0; c < constraints.length; c++) {
      const before = z.map((value, index) => value + increments[c][index]);
      const projected = project(before, constraints[c]);
      for (let index = 0; index < idealZ.length; index++) {
        increments[c][index] = before[index] - projected[index];
        maxChange = Math.max(maxChange, Math.abs(projected[index] - z[index]));
      }
      z = projected;
    }
    if (maxChange < PROJECTION_CONVERGENCE_TOLERANCE) return z;
  }

  throw new Error(
    "generateRamp: the constrained luminance ladder did not converge — " +
      "this is an internal solver failure, not an invalid input (infeasible " +
      "anchor placements are rejected before the solve starts).",
  );
}

// Longest path (in log-gap units) any pair of FIXED coordinates (the two
// edges, plus each anchor pinned to its own real luminance) can be forced to
// satisfy by the constraint graph below: `floor((high-low)/k)` full WCAG
// hops (weight `wcagLogFloor` each) plus the leftover `(high-low) % k`
// single steps at the monotonicity floor (weight `monotoneLogGap` each) —
// the greater per-distance rate always wins on the longest path, and the
// WCAG rate (`wcagLogFloor / k`) is deliberately larger than the
// monotonicity rate (`monotoneLogGap`), so spending WCAG hops first is
// always at least as tight as spending only monotonicity steps. If two
// fixed points are closer than that in the caller's actual luminances, no
// resampling of the FREE coordinates between them can fix it — pinning both
// exactly (which the ramp's whole point is) and clearing both floors are
// directly incompatible for that pair. Checked up front so the caller gets
// a specific, readable error instead of a solver that either doesn't
// converge or silently returns a ramp that fails AA.
function checkAnchorFeasibility(
  fixed: { index: number; value: number; label: string }[],
  k: number,
  wcagLogFloor: number,
  monotoneLogGap: number,
): void {
  const sorted = [...fixed].sort((a, b) => a.index - b.index);
  for (let a = 0; a < sorted.length; a++) {
    for (let b = a + 1; b < sorted.length; b++) {
      const low = sorted[a];
      const high = sorted[b];
      if (high.index === low.index) {
        // Two anchors landing on the exact same output step demand two
        // different fixed values there — a direct contradiction regardless
        // of which value is larger, not a one-directional ordering check.
        if (Math.abs(high.value - low.value) < PROJECTION_CONVERGENCE_TOLERANCE)
          continue;
        throw new Error(
          `generateRamp: ${low.label} and ${high.label} both land on ramp step ` +
            `${low.index} but pin it to different luminances. Space these anchors ` +
            "further apart.",
        );
      }
      const distance = high.index - low.index;
      const hops = Math.floor(distance / k);
      const remainder = distance - hops * k;
      const required = hops * wcagLogFloor + remainder * monotoneLogGap;
      const actual = high.value - low.value;
      if (actual >= required) continue;

      const achievable = Math.exp(actual);
      const needed = Math.exp(wcagLogFloor);
      const windowText =
        hops >= 1
          ? `${hops} full ${k}-step AA window${hops > 1 ? "s" : ""} (need >= ${needed.toFixed(2)}:1 per window)`
          : "the ramp's own light-to-dark order";
      throw new Error(
        `generateRamp: ${low.label} and ${high.label} are ${distance} ` +
          `ramp steps apart, spanning ${windowText}, but their own luminance only ` +
          `contrasts ${achievable.toFixed(2)}:1. Space these anchors further apart, or ` +
          "pick less similar luminances.",
      );
    }
  }
}

// Bisect for the curve parameter whose color hits `target` luminance. The
// curve runs black (t=0, Y=0) → white (t=1, Y=1) with monotone luminance, so
// every target in [0,1] is bracketed. 32 halvings put the parameter error at
// 2^-32, far below the 1/255 8-bit quantization of the output hex.
const BISECTION_STEPS = 32;

function parameterForLuminance(
  colorAtParam: (t: number) => number[],
  target: number,
): number {
  let low = 0;
  let high = 1;
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (low + high) / 2;
    if (relativeLuminance(colorAtParam(mid)) < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function euclidean3(v1: number[], v2: number[]): number {
  return Math.sqrt(
    (v1[0] - v2[0]) ** 2 + (v1[1] - v2[1]) ** 2 + (v1[2] - v2[2]) ** 2,
  );
}

// Builds a continuous color-at-parameter function over Oklab-space anchors
// (black, ...baseColors, white) in the caller-supplied waypoint order — not
// sorted by lightness, so a multi-anchor path can change hue at mid-L without
// the L-sort swapping the waypoints. Positions along the polyline are placed
// in warped parameter space via `unwarp` (cumulative Oklab arc length ->
// normalized distance -> unwarp), so a linearly-sampled output `t` passed
// through `warp` once re-lands on the matching anchor. A second remap of the
// mid-anchor window (the old tMin/tMax slice) would double-warp those
// waypoints and they would miss their own hex. Lightness is linear per Oklab
// segment; a and b use a monotone cubic spline across ALL anchors.
function sequentialInterpolator(rgbs: number[][]) {
  const fullRgbs = [[0, 0, 0], ...rgbs, [1, 1, 1]];
  const anchors = fullRgbs.map((rgb) => rgbToOklab(rgb));

  const L = anchors.map((v) => v[0]);
  const A = anchors.map((v) => v[1]);
  const B = anchors.map((v) => v[2]);

  const cumulativeDistances: number[] = [0];
  let totalDist = 0;
  for (let i = 1; i < anchors.length; i++) {
    totalDist += euclidean3(anchors[i], anchors[i - 1]);
    cumulativeDistances.push(totalDist);
  }

  const allParams = cumulativeDistances.map((d) =>
    unwarp(totalDist > 0 ? d / totalDist : 0),
  );

  const aInterpolator = createMonotone(allParams.map((p, i) => [p, A[i]]));
  const bInterpolator = createMonotone(allParams.map((p, i) => [p, B[i]]));

  const colorAtParam = (t: number): number[] => {
    const tWarped = warp(t);

    let i = 0;
    for (let j = 0; j < allParams.length - 1; j++) {
      if (tWarped <= allParams[j + 1]) {
        i = j;
        break;
      }
    }

    const dStart = allParams[i];
    const dEnd = allParams[i + 1];
    const ratio = (tWarped - dStart) / (dEnd - dStart || 1);
    const l = L[i] + ratio * (L[i + 1] - L[i]);
    const a = aInterpolator(tWarped);
    const b = bInterpolator(tWarped);

    return oklabToRgb([l, a, b]);
  };

  return {
    colorAtParam,
    parameters: allParams.slice(1, -1),
  };
}

// DERIVED: two-level scan resolution for `resampleCurveAtLuminance` below.
// The coarse pass (COARSE_SCAN_STEPS samples over the full t in [0,1]) finds
// the globally closest-achievable point without assuming the curve is
// monotonic; the fine pass then re-scans just the coarse winner's own
// neighboring interval at the same density, so the combined parameter
// resolution is COARSE_SCAN_STEPS * FINE_SCAN_STEPS ≈ 262144 — luminance
// error far below the ~1/255 = 0.0039 the 8-bit output hex can represent —
// for a total of only ~1024 curve evaluations (COARSE + FINE), cheap for a
// build/config-time call.
const COARSE_SCAN_STEPS = 512;
const FINE_SCAN_STEPS = 512;

// Finds the parameter `t` on `colorAtParam` whose color is closest to
// `target` luminance, WITHOUT assuming the curve is monotonic in `t` — a
// multi-anchor curve visits waypoints in caller order, not lightness order
// (`generateRamp`'s "keeps waypoints in input order, not sorted by
// lightness" contract), so it can have local luminance peaks/valleys a
// monotonic-assuming bisection would silently miss or misconverge on.
// Measured directly: a bisection-based version of this same correction
// (holding a step's own a/b fixed, bisecting only its L) produced a 0.0042
// luminance INVERSION between adjacent multi-anchor output steps for anchors
// `["#bdbebc", "#1adb04"]`; an exhaustive scan can't be fooled by a
// non-monotonic stretch since it just keeps the closest sample found, and
// scanning the FULL curve (not one step's frozen a/b) keeps every step
// searching the same achievable range instead of each being locked to
// whatever gamut-limited a/b its own unconstrained position happened to
// land on.
function resampleCurveAtLuminance(
  colorAtParam: (t: number) => number[],
  target: number,
): number[] {
  let bestT = 0;
  let bestDeviation = Infinity;
  for (let step = 0; step <= COARSE_SCAN_STEPS; step++) {
    const t = step / COARSE_SCAN_STEPS;
    const deviation = Math.abs(relativeLuminance(colorAtParam(t)) - target);
    if (deviation < bestDeviation) {
      bestDeviation = deviation;
      bestT = t;
    }
  }

  const neighborhood = 1 / COARSE_SCAN_STEPS;
  const low = Math.max(0, bestT - neighborhood);
  const high = Math.min(1, bestT + neighborhood);
  for (let step = 0; step <= FINE_SCAN_STEPS; step++) {
    const t = low + ((high - low) * step) / FINE_SCAN_STEPS;
    const deviation = Math.abs(relativeLuminance(colorAtParam(t)) - target);
    if (deviation < bestDeviation) {
      bestDeviation = deviation;
      bestT = t;
    }
  }

  return colorAtParam(bestT);
}

// Below this, a step whose solved luminance matches its baseline (within
// floating noise) is treated as "the solve left it alone" and the original
// hex is kept verbatim rather than re-derived through
// `resampleCurveAtLuminance` — this is what lets an anchor's exact input hex
// round-trip into the output whenever pinning it didn't require moving it.
// Far tighter than 8-bit hex quantization (~0.0039) and far looser than the
// float round-off the solver's repeated additions can leave behind (~1e-15).
const LUMINANCE_MATCH_TOLERANCE = 1e-9;

/**
 * Generate a WCAG-optimized sequential monochromatic ramp from one or more
 * anchor colors, black and white implicitly bracketing the ramp. When more
 * than one anchor color is given, each becomes a fixed waypoint the ramp
 * passes through in the given order — not sorted by lightness.
 *
 * Every anchor's luminance is PINNED at its nearest step (recovering its
 * exact hex whenever that's compatible with the constraints below; single
 * anchor included, which previously wasn't pinned at all). Every step's
 * luminance — pinned or not — is then resampled by `solveConstrainedLadder`
 * to the closest point (in log-contrast space) to the unconstrained WCAG
 * luminance ladder (`luminanceLadder`) that still satisfies: (a) strict
 * light-to-dark monotonicity, and (b) `(Y_hi + 0.05) >= 4.5 * (Y_lo + 0.05)`
 * for every pair of steps `K = ceil(0.501 * (stepsCount - 1))` apart — the
 * same span Ramp.ts's `contrastEfficiency` scores against (DESIGN.md §2.1) —
 * so `shift-N`/`shift-N+K` clears WCAG AA 4.5:1 for EVERY hue and EVERY
 * anchor placement, single- or multi-anchor alike. When the caller's own
 * anchors are placed too close together for both guarantees to hold at once
 * (checked up front, see `checkAnchorFeasibility`), this throws naming the
 * offending pair rather than silently violating one of them.
 *
 * Output is ordered light-to-dark (index 0 lightest, last index darkest) to
 * match `@domphy/theme`'s `ThemeInput.colors[name]` convention (`light.ts`'s
 * arrays start `#ffffff`, end `#000000`) — the result can be assigned there
 * directly.
 *
 * @param hexs one hex color, or several ordered by intended position
 * @param stepsCount number of output steps (18 matches the tone scale in
 *   `@domphy/theme`'s `ElementTones` — `shift-0`..`shift-17`)
 * @returns `stepsCount` hex colors, lightest first
 */
export function generateRamp(
  hexs: string | string[],
  stepsCount: number,
): string[] {
  const anchors = Array.isArray(hexs) ? hexs : [hexs];
  if (anchors.length === 0)
    throw new Error("generateRamp requires at least one anchor color");
  if (stepsCount <= 0) return [];
  // Round-trip through RGB so the single-step output matches the normalized
  // lowercase #rrggbb shape produced by the multi-step path below.
  if (stepsCount === 1) return [rgbToHex(hexToRgb(anchors[0]))];

  // Interpolator walks dark -> light with black/white brackets. Reverse the
  // caller's waypoints so the final light-to-dark reverse restores input order.
  const waypointHexes = anchors.map((hex) => rgbToHex(hexToRgb(hex))).reverse();
  const { colorAtParam, parameters } = sequentialInterpolator(
    [...anchors.map(hexToRgb)].reverse(),
  );

  const fullParams = [0, ...parameters, 1];
  const anchorIdx = fullParams.map((v) => Math.round(v * (stepsCount - 1)));

  // Baseline per-step color, BEFORE the WCAG solve — unchanged from the
  // pre-solve generator so a step the solve leaves alone (no active
  // constraint touches it) keeps exactly the color it always produced.
  // Single anchor: sample along the WCAG luminance ladder (§DESIGN.md 3.1).
  // Multi-anchor: walk the anchor-to-anchor parameter segments directly.
  const baseline: string[] = [];
  if (anchors.length === 1) {
    for (const target of luminanceLadder(stepsCount)) {
      baseline.push(
        rgbToHex(colorAtParam(parameterForLuminance(colorAtParam, target))),
      );
    }
  } else {
    let segment = 0;
    for (let k = 0; k < stepsCount; k++) {
      while (segment < anchorIdx.length - 2 && k > anchorIdx[segment + 1])
        segment++;

      const startIdx = anchorIdx[segment];
      const endIdx = anchorIdx[segment + 1];
      const startParam = fullParams[segment];
      const endParam = fullParams[segment + 1];

      let t: number;
      if (endIdx <= startIdx) {
        t = startParam;
      } else {
        const ratio = (k - startIdx) / (endIdx - startIdx);
        t = startParam + ratio * (endParam - startParam);
      }

      baseline.push(rgbToHex(colorAtParam(t)));
    }
  }

  // Pin every anchor to its nearest step (skipping a step that collides with
  // the fixed near-white/near-black edge — those stay exactly white/black
  // regardless of anchor placement, same as before).
  //
  // A SINGLE anchor's pin is SOFT: it only nudges that step's entry in
  // `idealZ` below, so the solve gets it as close to the anchor's own
  // luminance as the hard edges + WCAG floor allow, but never less. This is
  // what closes the former anchor-fidelity debt item without ever regressing
  // the WCAG guarantee generateTheme()'s callers depend on unconditionally —
  // a hard pin here would mean an ordinary saturated brand color whose pin
  // step happens to land within one WCAG window of an edge (a real,
  // non-rare case: dark, highly saturated hues do this) throws instead of
  // generating a theme.
  //
  // 2+ anchors are a caller deliberately asserting exact waypoints, so their
  // pins are HARD (`fixed`, checked for mutual feasibility up front) — the
  // ramp keeps each anchor's literal hex whenever the caller's waypoints are
  // already luminance-compatible with their own position order, and throws
  // naming the offending pair otherwise rather than silently breaking either
  // the pin or the WCAG guarantee.
  const fixed: { index: number; value: number; label: string }[] = [
    { index: 0, value: logGap(0), label: "the black edge" },
    {
      index: stepsCount - 1,
      value: logGap(1),
      label: "the white edge",
    },
  ];
  const idealOverride = new Map<number, number>();
  for (let i = 0; i < waypointHexes.length; i++) {
    const step = anchorIdx[i + 1];
    if (step <= 0 || step >= stepsCount - 1) continue;
    const anchorLogGap = logGap(relativeLuminance(hexToRgb(waypointHexes[i])));
    if (anchors.length > 1) {
      baseline[step] = waypointHexes[i];
      fixed.push({
        index: step,
        value: anchorLogGap,
        label: `anchor ${waypointHexes[i]}`,
      });
    } else {
      idealOverride.set(step, anchorLogGap);
    }
  }

  const k = idealSpanK(stepsCount);
  if (anchors.length > 1 && k >= 1 && k < stepsCount) {
    checkAnchorFeasibility(fixed, k, WCAG_LOG_FLOOR, MONOTONE_LOG_MARGIN);
  }

  const idealZ = baseline.map((hex, index) =>
    idealOverride.has(index)
      ? (idealOverride.get(index) as number)
      : logGap(relativeLuminance(hexToRgb(hex))),
  );

  const constraints: GapConstraint[] = fixed.map(({ index, value }) => ({
    low: index,
    high: index,
    minGap: value,
  }));
  for (let i = 1; i < stepsCount; i++) {
    constraints.push({ low: i - 1, high: i, minGap: MONOTONE_LOG_MARGIN });
  }
  if (k >= 1) {
    for (let i = 0; i + k < stepsCount; i++) {
      constraints.push({ low: i, high: i + k, minGap: WCAG_LOG_FLOOR });
    }
  }

  const solvedZ = solveConstrainedLadder(idealZ, constraints);

  // Realize the solved luminances as colors. A HARD-pinned step (a
  // multi-anchor waypoint whose target the solve left untouched) keeps its
  // literal hex exactly — `LUMINANCE_MATCH_TOLERANCE` confirms that rather
  // than assuming it. Every other step whose target moved off its baseline
  // is re-sampled from the FULL curve via `resampleCurveAtLuminance` (not
  // `colorAtParam(parameterForLuminance(...))`'s monotonicity-assuming
  // bisection): a single-anchor curve is always monotonic, but a
  // multi-anchor curve visiting waypoints out of lightness order is not
  // (exactly what "keeps waypoints in input order, not sorted by lightness"
  // exists to allow), so every step uses the same non-monotonicity-safe scan.
  const colors = baseline.map((hex, index) => {
    const solvedLuminance = Math.max(0, Math.min(1, expGap(solvedZ[index])));
    if (
      Math.abs(solvedLuminance - relativeLuminance(hexToRgb(hex))) <
      LUMINANCE_MATCH_TOLERANCE
    ) {
      return hex;
    }
    return rgbToHex(resampleCurveAtLuminance(colorAtParam, solvedLuminance));
  });

  // sequentialInterpolator walks dark (t=0) -> light (t=1); reverse to match
  // @domphy/theme's light-first convention.
  return colors.reverse();
}
