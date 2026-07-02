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
// (black, ...baseColors, white), sorted by lightness. The anchors' positions
// along the polyline are placed in "warped" parameter space via `unwarp`
// (cumulative Oklab arc length -> normalized distance -> unwarp), so that a
// linearly-sampled output parameter `t`, once passed back through `warp`,
// re-lands on the correct anchor position — same mechanism as Ramp.ts's
// contrastEfficiency metric, run in reverse to CONSTRUCT a ramp instead of
// SCORING one. Lightness is linearly interpolated per Oklab segment; a and b
// (chroma channels) use a monotone cubic spline across ALL anchors for a
// smooth, single-peak chroma trajectory (matches the Chroma Smoothness metric's
// ideal trajectory assumption).
function sequentialInterpolator(rgbs: number[][]) {
    const fullRgbs = [[0, 0, 0], ...rgbs, [1, 1, 1]];
    const anchors = fullRgbs.map((rgb) => rgbToOklab(rgb)).sort((a, b) => a[0] - b[0]);

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

    const tMin = rgbs.length === 1 ? 0 : allParams[1];
    const tMax = rgbs.length === 1 ? 1 : allParams[allParams.length - 2];

    const aInterpolator = createMonotone(allParams.map((p, i) => [p, A[i]]));
    const bInterpolator = createMonotone(allParams.map((p, i) => [p, B[i]]));

    const colorAtParam = (t: number): number[] => {
        const tWarped = warp(t);
        const tMapped = tMin + tWarped * (tMax - tMin);

        let i = 0;
        for (let j = 0; j < allParams.length - 1; j++) {
            if (tMapped <= allParams[j + 1]) {
                i = j;
                break;
            }
        }

        const dStart = allParams[i];
        const dEnd = allParams[i + 1];
        const ratio = (tMapped - dStart) / (dEnd - dStart || 1);
        const l = L[i] + ratio * (L[i + 1] - L[i]);
        const a = aInterpolator(tMapped);
        const b = bInterpolator(tMapped);

        return oklabToRgb([l, a, b]);
    };

    return {
        colorAtParam,
        parameters: allParams.slice(1, -1).map((v) => (v - tMin) / (tMax - tMin)),
    };
}

/**
 * Generate a WCAG-optimized sequential monochromatic ramp from one or more
 * anchor colors, black and white implicitly bracketing the ramp. When more
 * than one anchor color is given, each becomes a fixed waypoint the ramp
 * passes through (e.g. a specific brand color pinned at a specific step),
 * still connected by the same warped Oklab interpolation.
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
    if (stepsCount === 1) return [anchors[0]];

    const { colorAtParam, parameters } = sequentialInterpolator(anchors.map(hexToRgb));
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

    // sequentialInterpolator walks dark (t=0) -> light (t=1); reverse to match
    // @domphy/theme's light-first convention.
    return colors.reverse();
}
