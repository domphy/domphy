import { getEuclideanDistance } from "./math";
import { hexToRgb, labToRgb, lchToLab, oklabToRgb, rgbToHex, rgbToOklab } from "./utils";
import { Ramp } from "./Ramp";

const SEED = 42;
const STEPS_LIST = [18];

const P0 = 0.55;
const Q0 = 0.95;

function mulberry32(a: number) {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

let rand = mulberry32(SEED);

function warp(t: number, p: number, q: number): number {
    const tp = Math.pow(t, p);
    return tp / (1 + q * (1 - tp));
}

function unwarp(y: number, p: number, q: number): number {
    const x = (y * (1 + q)) / (1 + y * q);
    return Math.pow(x, 1 / p);
}

function sequentialInterpolator(rgbs: number[][], p: number, q: number) {
    const fullRgbs = [
        [0, 0, 0],
        ...rgbs,
        [1, 1, 1],
    ];

    const anchors = fullRgbs.map((rgb) => rgbToOklab(rgb)).sort((a, b) => a[0] - b[0]);

    const L = anchors.map((v) => v[0]);
    const A = anchors.map((v) => v[1]);
    const B = anchors.map((v) => v[2]);

    const cumulativeDistances: number[] = [0];
    let totalDist = 0;

    for (let i = 1; i < anchors.length; i++) {
        totalDist += getEuclideanDistance(anchors[i], anchors[i - 1]);
        cumulativeDistances.push(totalDist);
    }

    const allParams = cumulativeDistances.map((d) =>
        unwarp(totalDist > 0 ? d / totalDist : 0, p, q)
    );

    const tMin = rgbs.length === 1 ? 0 : allParams[1];
    const tMax = rgbs.length === 1 ? 1 : allParams[allParams.length - 2];

    const colorAtParam = (t: number): number[] => {
        const tWarped = warp(t, p, q);
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
        const a = A[i] + ratio * (A[i + 1] - A[i]);
        const b = B[i] + ratio * (B[i + 1] - B[i]);

        return oklabToRgb([l, a, b]);
    };

    return {
        colorAtParam,
        parameters: allParams.slice(1, -1).map((v) => (v - tMin) / (tMax - tMin)),
    };
}

function generateRampPQ(hexs: string | string[], stepsCount: number, p: number, q: number) {
    hexs = Array.isArray(hexs) ? hexs : [hexs];

    if (stepsCount <= 0) return [];
    if (stepsCount === 1) return [hexs[0]];

    const { colorAtParam, parameters } = sequentialInterpolator(hexs.map(hexToRgb), p, q);
    const colors: string[] = [];

    const fullParams = [0, ...parameters, 1];
    const anchorIdx = fullParams.map((v) => Math.round(v * (stepsCount - 1)));

    let segment = 0;

    for (let k = 0; k < stepsCount; k++) {
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
            t = startParam + ratio * (endParam - startParam);
        }

        colors.push(rgbToHex(colorAtParam(t)));
    }

    return colors;
}

function wrapHue(h: number): number {
    let x = h % 360;
    if (x < 0) x += 360;
    return x;
}

function randomGreenEdgeHex(): string {
    // green zone: ~105°–140°
    const h = wrapHue(122 + (rand() - 0.5) * 35);
    const c = 55 + rand() * 45;   // high chroma
    const l = 55 + rand() * 30;   // fairly high lightness
    return rgbToHex(labToRgb(lchToLab([l, c, h])));
}

function randomBlueGreenEdgeHex(): string {
    // blue-green / cyan zone: ~170°–225°
    const h = wrapHue(198 + (rand() - 0.5) * 55);
    const c = 50 + rand() * 45;
    const l = 45 + rand() * 35;
    return rgbToHex(labToRgb(lchToLab([l, c, h])));
}

function randomHighChromaLightHex(): string {
    const h = rand() * 360;
    const c = 50 + rand() * 45;
    const l = 58 + rand() * 37;
    return rgbToHex(labToRgb(lchToLab([l, c, h])));
}

function makeDataset(generator: () => string, count: number): string[] {
    return Array.from({ length: count }, generator);
}

function idealSpan(N: number): number {
    return Math.ceil(0.501 * (N - 1));
}

export type OptimizeResult = {
    p: number;
    q: number;
    avgScore: number;
    coverage: number;
    exact: number;
    spanError: number;
};

function evaluatePQ(p: number, q: number, samples: string[]): OptimizeResult {
    let totalScore = 0;
    let coverageCount = 0;
    let exactCount = 0;
    let totalSpanError = 0;

    const totalCases = samples.length * STEPS_LIST.length;

    for (const base of samples) {
        for (const N of STEPS_LIST) {
            const ramp = generateRampPQ(base, N, p, q);
            const metrics = new Ramp(ramp);

            const span = metrics.wcag[45].span;
            const score = metrics.score;
            const kIdeal = idealSpan(N);

            totalScore += score;
            if (span <= kIdeal) coverageCount++;
            if (span === kIdeal) exactCount++;
            totalSpanError += Math.abs(span - kIdeal);
        }
    }

    return {
        p,
        q,
        avgScore: totalScore / totalCases,
        coverage: coverageCount / totalCases,
        exact: exactCount / totalCases,
        spanError: totalSpanError / totalCases,
    };
}

function combinedScore(x: OptimizeResult): number {
    return (
        x.avgScore * 0.6 +
        x.coverage * 100 * 0.25 +
        x.exact * 100 * 0.1 -
        x.spanError * 10 * 0.05
    );
}

function better(a: OptimizeResult, b: OptimizeResult): boolean {
    return combinedScore(a) > combinedScore(b);
}

function gridSearch(
    samples: string[],
    pMin: number,
    pMax: number,
    qMin: number,
    qMax: number,
    step: number,
    initialBest: OptimizeResult | null = null
) {
    let best: OptimizeResult | null = initialBest;

    for (let p = pMin; p <= pMax + 1e-12; p += step) {
        for (let q = qMin; q <= qMax + 1e-12; q += step) {
            const pp = +p.toFixed(6);
            const qq = +q.toFixed(6);

            const result = evaluatePQ(pp, qq, samples);
            if (!best || better(result, best)) {
                best = result;
            }
        }
    }

    return best as OptimizeResult;
}

function refine(
    samples: string[],
    start: { p: number; q: number },
    initialStep = 0.02,
    minStep = 0.001
) {
    let best: OptimizeResult = evaluatePQ(start.p, start.q, samples);
    let step = initialStep;

    const visited = new Set<string>();
    visited.add(`${best.p.toFixed(6)}-${best.q.toFixed(6)}`);

    while (step >= minStep) {
        let improved = false;

        const candidates: [number, number][] = [
            [best.p + step, best.q],
            [best.p - step, best.q],
            [best.p, best.q + step],
            [best.p, best.q - step],
            [best.p + step, best.q + step],
            [best.p + step, best.q - step],
            [best.p - step, best.q + step],
            [best.p - step, best.q - step],
        ];

        for (const [p, q] of candidates) {
            const pp = +p.toFixed(6);
            const qq = +q.toFixed(6);
            const key = `${pp}-${qq}`;

            if (visited.has(key)) continue;
            visited.add(key);

            const result = evaluatePQ(pp, qq, samples);
            if (better(result, best)) {
                best = result;
                improved = true;
            }
        }

        if (!improved) {
            step *= 0.5;
        }
    }

    return best;
}

export type OptimizeOptions = {
    /** Number of green-edge samples (default 150). */
    green?: number;
    /** Number of blue-green-edge samples (default 150). */
    blueGreen?: number;
    /** Number of random high-chroma samples (default 300). */
    random?: number;
    /** Coarse grid step (default 0.1). */
    gridStep?: number;
    /** Refine step start (default 0.02). */
    refineStep?: number;
    /** Refine minimum step (default 0.005). */
    refineMinStep?: number;
};

/**
 * Tune the ramp warp parameters (p, q) against a generated dataset of edge-case
 * hues. Deterministic (seeded RNG). Pure-JS; returns the best-scoring result.
 */
export const optimize = (options: OptimizeOptions = {}): OptimizeResult => {
    const {
        green = 150,
        blueGreen = 150,
        random = 300,
        gridStep = 0.1,
        refineStep = 0.02,
        refineMinStep = 0.005,
    } = options;

    // Reset RNG so results are deterministic per call.
    rand = mulberry32(SEED);

    const greenSamples = makeDataset(randomGreenEdgeHex, green);
    const blueGreenSamples = makeDataset(randomBlueGreenEdgeHex, blueGreen);
    const randomSamples = makeDataset(randomHighChromaLightHex, random);

    const combinedSamples = [
        ...greenSamples,
        ...blueGreenSamples,
        ...randomSamples,
    ];

    const baseline = evaluatePQ(P0, Q0, combinedSamples);
    let best = gridSearch(combinedSamples, 0.4, 0.8, 0.5, 1.2, gridStep, baseline);
    best = refine(combinedSamples, { p: best.p, q: best.q }, refineStep, refineMinStep);

    return best;
};
