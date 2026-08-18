import { createMonotone, hexToRgb, oklabToRgb, rgbToHex, rgbToOklab } from "./utils.js";

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
 */
const P = 0.605;
const Q = 0.685;

function warp(t: number): number {
    const tn = Math.pow(t, P);
    return tn / (1 + Q * (1 - tn));
}

function unwarp(y: number): number {
    const xn = (y * (1 + Q)) / (1 + y * Q);
    return Math.pow(xn, 1 / P);
}

function euclidean3(v1: number[], v2: number[]): number {
    return Math.sqrt(
        Math.pow(v1[0] - v2[0], 2) +
        Math.pow(v1[1] - v2[1], 2) +
        Math.pow(v1[2] - v2[2], 2),
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

    const allParams = cumulativeDistances.map((d) => unwarp(totalDist > 0 ? d / totalDist : 0));

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

/**
 * Generate a WCAG-optimized sequential monochromatic ramp from one or more
 * anchor colors, black and white implicitly bracketing the ramp. When more
 * than one anchor color is given, each becomes a fixed waypoint the ramp
 * passes through in the given order — not sorted by lightness — and the
 * input hex is pinned onto its nearest step so mid-anchors round-trip.
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
export function generateRamp(hexs: string | string[], stepsCount: number): string[] {
    const anchors = Array.isArray(hexs) ? hexs : [hexs];
    if (anchors.length === 0) throw new Error("generateRamp requires at least one anchor color");
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
    const colors: string[] = [];

    const fullParams = [0, ...parameters, 1];
    const anchorIdx = fullParams.map((v) => Math.round(v * (stepsCount - 1)));

    let segment = 0;
    for (let k = 0; k < stepsCount; k++) {
        while (segment < anchorIdx.length - 2 && k > anchorIdx[segment + 1]) segment++;

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

        colors.push(rgbToHex(colorAtParam(t)));
    }

    // Pin multi-anchor waypoints to their nearest step so mid-anchors
    // round-trip their input hex. A single-anchor ramp is not pinned: the
    // nearest interpolated step is already close, and overwriting it with
    // the source hex can invert relative luminance vs its neighbors.
    if (waypointHexes.length > 1) {
        for (let i = 0; i < waypointHexes.length; i++) {
            const step = anchorIdx[i + 1];
            if (step >= 0 && step < colors.length) {
                colors[step] = waypointHexes[i];
            }
        }
    }

    // sequentialInterpolator walks dark (t=0) -> light (t=1); reverse to match
    // @domphy/theme's light-first convention.
    return colors.reverse();
}
