import { hexToRgb, labToLch, rgbToLab, toLightnessEAL } from "./utils";

export class Swatch {
    readonly hex: string;

    constructor(hex: string) {
        this.hex = hex;
    }

    get rgb() {
        return hexToRgb(this.hex);
    }

    get lab() {
        return rgbToLab(this.rgb);
    }

    get lch() {
        return labToLch(this.lab);
    }

    get lightness() {
        // Equivalent Achromatic Lightness (High et al., 2023). Delegates to the
        // shared toLightnessEAL() so the formula lives in exactly one place.
        return toLightnessEAL(this.lab);
    }

    get chroma() {
        return this.lch[1];
    }

    get hue() {
        return this.lch[2];
    }

    get luminance() {
        const [r, g, b] = this.rgb;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
}
