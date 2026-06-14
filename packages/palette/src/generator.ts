import { createMonotone, hexToRgb, oklabToRgb, rgbToHex, rgbToOklab } from "./utils";
import { getEuclideanDistance } from "./math";

// Tuned warp parameters from the chromametry optimizer (see optimize.ts).
const parameters = {
    step: 0.005,
    p: 0.605,
    q: 0.685,
    avgScore: 90.64326865384558,
    coverage: 0.9590384615384615,
    exact: 0.8847884615384616,
    spanError: 0.11521153846153846
}

let P = parameters.p
let Q = parameters.q

const warp = (t: number): number => {
    const tn = Math.pow(t, P);
    return tn / (1 + Q * (1 - tn));
}

const unwarp = (y: number): number => {
    const xn = (y * (1 + Q)) / (1 + y * Q);
    return Math.pow(xn, 1 / P);
}

const sequentialInterpolator = (rgbs: number[][]) => {
    const fullRgbs = [[0, 0, 0], ...rgbs, [1, 1, 1]];
    let anchors = fullRgbs.map(rgb => rgbToOklab(rgb));

    anchors.sort((a, b) => a[0] - b[0]);

    const L = anchors.map(p => p[0]);
    const A = anchors.map(p => p[1]);
    const B = anchors.map(p => p[2]);

    const cumulativeDistances: number[] = [0];
    let totalDist = 0;
    for (let i = 1; i < anchors.length; i++) {
        totalDist += getEuclideanDistance(anchors[i], anchors[i - 1]);
        cumulativeDistances.push(totalDist);
    }

    const allParams = cumulativeDistances.map(d => unwarp(totalDist > 0 ? d / totalDist : 0));

    const tMin = rgbs.length == 1 ? 0 : allParams[1];
    const tMax = rgbs.length == 1 ? 1 : allParams[allParams.length - 2];

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
        parameters: allParams.slice(1, -1).map(p => (p - tMin) / (tMax - tMin))
    };
};

/**
 * Generate a perceptually-uniform color ramp from one or more anchor colors.
 * Pure-JS implementation (no WASM). Returns `stepsCount` sRGB hex strings.
 */
export const generateRamp = (hexs: string | string[], stepsCount: number): string[] => {
    hexs = Array.isArray(hexs) ? hexs : [hexs];
    if (stepsCount <= 0) return [];
    if (stepsCount === 1) return [hexs[0]];

    const { colorAtParam, parameters } = sequentialInterpolator(hexs.map(hexToRgb));
    const colors: string[] = [];

    // Full anchors including start (0) and end (1)
    const fullParams = [0, ...parameters, 1];
    const anchorIdx = fullParams.map(p => Math.round(p * (stepsCount - 1)));

    let segment = 0;

    for (let k = 0; k < stepsCount; k++) {
        // Find the correct segment for current k
        while (segment < anchorIdx.length - 2 && k > anchorIdx[segment + 1]) {
            segment++;
        }

        const startIdx = anchorIdx[segment];
        const endIdx = anchorIdx[segment + 1];
        const startParam = fullParams[segment];
        const endParam = fullParams[segment + 1];

        let t: number;
        if (endIdx <= startIdx) {
            t = startParam;
        } else {
            const ratio = (k - startIdx) / (endIdx - startIdx);
            // Linear interpolation between the anchor parameters
            t = startParam + ratio * (endParam - startParam);
        }

        // The colorAtParam function already handles warping and mapping internally
        colors.push(rgbToHex(colorAtParam(t)));
    }

    return colors;
};
