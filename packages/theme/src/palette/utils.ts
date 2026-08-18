/** Gamma-encode linear RGB (0-1) to 8-bit sRGB channels (0-255). */
const lrgbToSrgb = (rgb: number[]) => {
    const toSRGB = (c: number) => {
        const clamped = Math.max(0, Math.min(1, c));
        const s = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
        return Math.max(0, Math.min(255, Math.round(s * 255)));
    };
    return rgb.map(toSRGB);
}

const srgbToLrgb = (rgb: number[]) => {
    const toLRGB = (c: number) => (c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92);
    return rgb.map(toLRGB);
}

/** Convert linear RGB to sRGB Hex string. */
export const rgbToHex = (rgb: number[]): string => {

    let [r, g, b] = lrgbToSrgb(rgb) as any[]
    r = r.toString(16).padStart(2, "0");
    g = g.toString(16).padStart(2, "0");
    b = b.toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
};

/** Whether a string is a supported CSS hex color: #rgb, #rgba, #rrggbb, or #rrggbbaa. */
export const isValidHex = (hex: string): boolean =>
    typeof hex === "string" && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex);

/**
 * Normalize a CSS hex color to its lowercase expanded form (#rrggbb, or
 * #rrggbbaa when an alpha channel is present). Throws on invalid input.
 */
export const normalizeHex = (hex: string): string => {
    if (!isValidHex(hex)) {
        throw new Error(
            `Invalid hex color "${hex}": expected "#rgb", "#rgba", "#rrggbb", or "#rrggbbaa" (hex digits 0-9, a-f, case-insensitive).`
        );
    }
    let digits = hex.slice(1).toLowerCase();
    if (digits.length <= 4) {
        digits = digits.split("").map((c) => c + c).join("");
    }
    return `#${digits}`;
};

/** Convert sRGB Hex string to linear RGB. Alpha digits, if present, are ignored. */
export const hexToRgb = (hex: string): number[] => {
    const normalized = normalizeHex(hex);
    const r = parseInt(normalized.slice(1, 3), 16) / 255;
    const g = parseInt(normalized.slice(3, 5), 16) / 255;
    const b = parseInt(normalized.slice(5, 7), 16) / 255;

    return srgbToLrgb([r, g, b])
};

/** Converts linear RGB to Oklab color space. */
/** Specification: Björn Ottosson (2020). */
export const rgbToOklab = (rgb: number[]): number[] => {
    const l = 0.4122214708 * rgb[0] + 0.5363325363 * rgb[1] + 0.0514459929 * rgb[2];
    const m = 0.2119034982 * rgb[0] + 0.6806995451 * rgb[1] + 0.1073969566 * rgb[2];
    const s = 0.0883024619 * rgb[0] + 0.2817188376 * rgb[1] + 0.6299787005 * rgb[2];
    const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
    return [
        0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
    ];
};

/** Converts Oklab color space to linear RGB. */
/** Specification: Björn Ottosson (2020). */
export const oklabToRgb = (lab: number[]): number[] => {
    const [L, a, b] = lab;
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
};

/** Calculate Equivalent Achromatic Lightness (L_EAL) using High et al. (2023). */
export const toLightnessEAL = (lab: number[]): number => {
    const [L, a, b] = lab;
    const C = Math.sqrt(a * a + b * b);
    const hRad = Math.atan2(b, a);
    const hDeg = (hRad * 180 / Math.PI + 360) % 360;

    const k1 = 0.1644, k2 = 0.0603, k3 = 0.1307, k4 = 0.0060;
    const fBYh = k1 * Math.abs(Math.sin(((hDeg - 90) / 2) * (Math.PI / 180))) + k2;

    let fRh = 0;
    if (hDeg <= 90 || hDeg >= 270) {
        fRh = k3 * Math.abs(Math.cos(hDeg * (Math.PI / 180))) + k4;
    }
    return L + (fBYh + fRh) * C;
};

/** Reverse L_EAL to get CIELAB Lightness (L). */
export const fromLightnessEAL = (brightness: number, lab: number[]): number => {
    const [, a, b] = lab;
    const C = Math.sqrt(a * a + b * b);
    const hRad = Math.atan2(b, a);
    const hDeg = (hRad * 180 / Math.PI + 360) % 360;

    const k1 = 0.1644, k2 = 0.0603, k3 = 0.1307, k4 = 0.0060;
    const fBYh = k1 * Math.abs(Math.sin(((hDeg - 90) / 2) * (Math.PI / 180))) + k2;

    let fRh = 0;
    if (hDeg <= 90 || hDeg >= 270) {
        fRh = k3 * Math.abs(Math.cos(hDeg * (Math.PI / 180))) + k4;
    }
    return Math.max(0, brightness - (fBYh + fRh) * C);
};


/** Convert LCH to CIELAB coordinates. */
export const lchToLab = (lch: number[]): number[] => {
    const [L, C, h] = lch;
    const hRad = (h * Math.PI) / 180;
    return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
};

/** Convert linear sRGB to CIELAB (D65) */
export const rgbToLab = (rgb: number[]): number[] => {
    const [r, g, b] = rgb;

    // sRGB → XYZ (D65)
    const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    const z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

    // D65 reference white
    const Xn = 0.95047;
    const Yn = 1.00000;
    const Zn = 1.08883;

    const f = (t: number) =>
        t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);

    const fx = f(x / Xn);
    const fy = f(y / Yn);
    const fz = f(z / Zn);

    return [
        116 * fy - 16,
        500 * (fx - fy),
        200 * (fy - fz),
    ];
};

/** Convert CIELAB (D65) to linear sRGB */
export const labToRgb = (lab: number[]): number[] => {
    const [L, a, b] = lab;

    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;

    const fInv = (t: number) =>
        t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;

    // D65 reference white
    const Xn = 0.95047;
    const Yn = 1.00000;
    const Zn = 1.08883;

    const x = fInv(fx) * Xn;
    const y = fInv(fy) * Yn;
    const z = fInv(fz) * Zn;

    // XYZ (D65) → sRGB
    return [
        3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
        -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
        0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
    ];
};

/** Convert CIELAB to LCH coordinates. */
export const labToLch = (lab: number[]): number[] => {
    const [L, a, b] = lab;
    const C = Math.sqrt(a * a + b * b);
    if (C < 0.0001) return [L, 0, 0];

    const hRad = Math.atan2(b, a);
    let hDeg = (hRad * 180 / Math.PI + 360) % 360;
    if (hDeg >= 359.9999) hDeg = 0;

    return [L, C, hDeg];
};
/**
 * CIEDE2000 color difference (Sharma, Wu & Dalal 2005 / CIE 15).
 * Includes the achromatic (C′1·C′2 = 0) and h̄ wrap branches: Δh′ = 0 and
 * h̄′ = h′1 + h′2 when either sample is achromatic; when both are chromatic
 * and |h′1 − h′2| > 180°, h̄′ uses (h′1 + h′2 + 360) / 2 if the sum is
 * under 360° and (h′1 + h′2 − 360) / 2 otherwise.
 */
export const calcDeltaE2000 = (lab1: number[], lab2: number[]): number => {
    const [L1, a1, b1] = lab1;
    const [L2, a2, b2] = lab2;
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const avgC = (C1 + C2) / 2;
    const G = 0.5 * (1 - Math.sqrt(avgC ** 7 / (avgC ** 7 + 25 ** 7)));
    const a1p = a1 * (1 + G);
    const a2p = a2 * (1 + G);
    const C1p = Math.hypot(a1p, b1);
    const C2p = Math.hypot(a2p, b2);
    const avgCp = (C1p + C2p) / 2;

    const huePrime = (aPrime: number, b: number): number => {
        if (aPrime === 0 && b === 0) return 0;
        const angle = (Math.atan2(b, aPrime) * 180) / Math.PI;
        return angle >= 0 ? angle : angle + 360;
    };
    const h1p = huePrime(a1p, b1);
    const h2p = huePrime(a2p, b2);
    const hueDifference = h2p - h1p;
    const hueAbs = Math.abs(hueDifference);
    const hueSum = h1p + h2p;
    const achromatic = C1p * C2p === 0;

    let dhp: number;
    if (achromatic) dhp = 0;
    else if (hueAbs <= 180) dhp = hueDifference;
    else if (hueDifference > 180) dhp = hueDifference - 360;
    else dhp = hueDifference + 360;

    // Sharma / CIE: h̄′ when either C′ is 0 is the sum (the chromatic hue, or
    // 0 if both are gray). The wrap when |Δh′| > 180° picks +360 or −360
    // from whether the raw sum sits below 360°.
    let avgHp: number;
    if (achromatic) avgHp = hueSum;
    else if (hueAbs <= 180) avgHp = hueSum / 2;
    else if (hueSum < 360) avgHp = (hueSum + 360) / 2;
    else avgHp = (hueSum - 360) / 2;

    const T =
        1 -
        0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
        0.24 * Math.cos((2 * avgHp * Math.PI) / 180) +
        0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
        0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);
    const dLp = L2 - L1;
    const dCp = C2p - C1p;
    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * Math.PI / 180);
    const avgL = (L1 + L2) / 2;
    const SL = 1 + (0.015 * (avgL - 50) ** 2) / Math.sqrt(20 + (avgL - 50) ** 2);
    const SC = 1 + 0.045 * avgCp;
    const SH = 1 + 0.015 * avgCp * T;
    const dtheta = 30 * Math.exp(-(((avgHp - 275) / 25) ** 2));
    const RC = 2 * Math.sqrt(avgCp ** 7 / (avgCp ** 7 + 25 ** 7));
    const RT = -RC * Math.sin((2 * dtheta * Math.PI) / 180);
    return Math.sqrt(
        (dLp / SL) ** 2 +
        (dCp / SC) ** 2 +
        (dHp / SH) ** 2 +
        RT * (dCp / SC) * (dHp / SH),
    );
};

/**
 * Convert a CSS rgb()/rgba() string to linear RGB. Supports legacy comma
 * syntax ("rgb(255, 0, 0)"), percentage channels ("rgb(100%, 0%, 0%)"), and
 * modern space/slash syntax ("rgb(255 0 0 / 50%)"). Alpha is ignored.
 */
export const cssRgbToRgb = (css: string): number[] => {
    const invalid = () =>
        new Error(
            `Invalid CSS rgb() "${css}": expected "rgb(r, g, b)" with channels 0-255 or 0%-100% (comma or space separated, optional alpha after "," or "/").`
        );

    const match = /^\s*rgba?\(\s*(.+?)\s*\)\s*$/i.exec(css);
    if (!match) throw invalid();

    // Strip the optional alpha ("..., a" or "... / a"); it does not affect RGB.
    const body = match[1].split("/")[0];
    const parts = body.includes(",")
        ? body.split(",").map((part) => part.trim()).slice(0, 3)
        : body.trim().split(/\s+/);
    if (parts.length !== 3) throw invalid();

    const channels = parts.map((part) =>
        part.endsWith("%") ? (parseFloat(part) / 100) * 255 : parseFloat(part)
    );
    if (channels.some((c) => !Number.isFinite(c))) throw invalid();

    const toLinear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return channels.map(toLinear);
};



/**
 * Create a Monotone Cubic Hermite Interpolator.
 * Ensures monotonicity is preserved between points.
 * Fritsch, F. N., & Carlson, R. E. (1980). Monotone piecewise cubic interpolation. *SIAM Journal on Numerical Analysis*, 17(2), 238–246.
 */

export const createMonotone = (points: number[][]) => {
    if (points.length < 1) return (_t: number) => 0;

    const sorted = [...points].sort((a, b) => a[0] - b[0]);
    const uniquePoints: number[][] = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i === 0 || sorted[i][0] !== sorted[i - 1][0]) {
            uniquePoints.push(sorted[i]);
        }
    }

    const n = uniquePoints.length;
    if (n === 1) return (_t: number) => uniquePoints[0][1];

    const x = uniquePoints.map(p => p[0]);
    const y = uniquePoints.map(p => p[1]);
    const h: number[] = [];
    const secants: number[] = [];

    for (let i = 0; i < n - 1; i++) {
        h[i] = x[i + 1] - x[i];
        secants[i] = (y[i + 1] - y[i]) / h[i];
    }

    const m: number[] = new Array(n);
    m[0] = secants[0];
    m[n - 1] = secants[n - 2];

    for (let i = 1; i < n - 1; i++) {
        const d0 = secants[i - 1];
        const d1 = secants[i];
        if (d0 * d1 <= 0) {
            m[i] = 0;
        } else {
            const alpha = (1 + h[i] / (h[i - 1] + h[i])) / 3;
            m[i] = (d0 * d1) / ((1 - alpha) * d0 + alpha * d1);
        }
    }

    return (t: number): number => {
        if (t <= x[0]) return y[0];
        if (t >= x[n - 1]) return y[n - 1];

        let low = 0;
        let high = n - 2;
        let i = 0;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (t >= x[mid] && t <= x[mid + 1]) {
                i = mid;
                break;
            }
            if (t < x[mid]) high = mid - 1;
            else low = mid + 1;
        }

        const dx = h[i];
        const s = (t - x[i]) / dx;
        const s2 = s * s;
        const s3 = s2 * s;
        const m0 = m[i] * dx;
        const m1 = m[i + 1] * dx;

        return (2 * s3 - 3 * s2 + 1) * y[i] +
            (s3 - 2 * s2 + s) * m0 +
            (-2 * s3 + 3 * s2) * y[i + 1] +
            (s3 - s2) * m1;
    };
};

/** Calculate Root Mean Square (RMS) of an array. */
export function rootMeanSquare(values: number[]): number {
    const n = values.length;
    if (n === 0) return 0;

    let sumSq = 0;
    for (let i = 0; i < n; i++) {
        sumSq += values[i] * values[i];
    }
    return Math.sqrt(sumSq / n);
}

/** Calculate min, max, and average of an array. */
export const calcStatistics = (array: number[]) => {
    const n = array.length;
    if (n === 0) return { min: 0, max: 0, avg: 0 };

    let min = array[0];
    let max = array[0];
    let sum = 0;

    for (let i = 0; i < n; i++) {
        const v = array[i];
        if (v < min) min = v;
        if (v > max) max = v;
        sum += v;
    }

    return { min, max, avg: sum / n };
};

/** Calculate geometric mean score (0-100) from metrics. */
export const calcScore = (metrics: number[]): number => {
    const n = metrics.length;
    if (n === 0) return 0;

    const eps = 1e-6;
    const product = metrics.reduce((acc, score) => acc * (score + eps), 1);
    const globalScore = Math.pow(product, 1 / n);
    const result = Math.max(0, Math.min(1, globalScore));
    return parseFloat((result * 100).toFixed(2));
};

/**
 * Compute WCAG 2.1 contrast ratio between two hex colors.
 * Returns a value >= 1. Passes WCAG AA at >= 4.5, AAA at >= 7.
 */
export const contrastRatio = (hex1: string, hex2: string): number => {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    const l1 = 0.2126 * r1 + 0.7152 * g1 + 0.0722 * b1;
    const l2 = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2;
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Mix two hex colors. `ratio` controls how much of the second color is used
 * (0 = all hex1, 1 = all hex2, default 0.5). Interpolation happens in
 * the given `space` — defaults to `oklab` (perceptually uniform).
 */
export const mix = (
    hex1: string,
    hex2: string,
    ratio = 0.5,
    space: 'oklab' | 'lab' | 'rgb' = 'oklab'
): string => {
    const t = Math.max(0, Math.min(1, ratio));
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    if (space === 'rgb') {
        return rgbToHex(rgb1.map((c, i) => c + t * (rgb2[i] - c)));
    }

    if (space === 'lab') {
        const lab1 = rgbToLab(rgb1);
        const lab2 = rgbToLab(rgb2);
        return rgbToHex(labToRgb(lab1.map((c, i) => c + t * (lab2[i] - c))));
    }

    // Default: oklab
    const ok1 = rgbToOklab(rgb1);
    const ok2 = rgbToOklab(rgb2);
    return rgbToHex(oklabToRgb(ok1.map((c, i) => c + t * (ok2[i] - c))));
};

/**
 * Generate a `steps`-step gradient across `colors` (2 or more anchors).
 * Interpolation is in Oklab for perceptual uniformity.
 * Returns hex strings from the first to the last anchor.
 */
export const scale = (colors: string[], steps: number): string[] => {
    if (colors.length < 2) throw new Error("scale() requires at least 2 colors");
    if (steps < 1) return [];
    // Round-trip through RGB so the single-step output matches the normalized
    // lowercase #rrggbb shape produced by the multi-step path.
    if (steps === 1) return [rgbToHex(hexToRgb(colors[0]))];

    const oklabs = colors.map(hex => rgbToOklab(hexToRgb(hex)));
    const segments = oklabs.length - 1;
    const result: string[] = [];

    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const pos = t * segments;
        const seg = Math.min(Math.floor(pos), segments - 1);
        const localT = pos - seg;
        const ok1 = oklabs[seg];
        const ok2 = oklabs[seg + 1];
        result.push(rgbToHex(oklabToRgb(ok1.map((c, j) => c + localT * (ok2[j] - c)))));
    }

    return result;
};
