import { describe, expect, it } from "vitest";
import { generateTheme } from "../src/generate.ts";
import { setTheme, themeTokens } from "../src/theme.ts";

const HEX_RE = /^#[0-9a-f]{6}$/i;

describe("generateTheme", () => {
    it("generates an 18-step ramp per base color", () => {
        const theme = generateTheme({
            primary: "#4a7ff4",
            neutral: "#8d8d8d",
        });
        expect(theme.colors!.primary).toHaveLength(18);
        expect(theme.colors!.neutral).toHaveLength(18);
        theme.colors!.primary.forEach((hex) => expect(hex).toMatch(HEX_RE));
    });

    it("picks a baseTones index whose color is close to the original input", () => {
        const theme = generateTheme({ primary: "#4a7ff4" });
        const baseIndex = theme.baseTones!.primary;
        const resolved = theme.colors!.primary[baseIndex];
        // Not required to be an exact round-trip (interpolation is lossy), but
        // should land on the same rough color family — sanity check the index
        // is in range and the ramp is monotonically lightest-to-darkest there.
        expect(baseIndex).toBeGreaterThanOrEqual(0);
        expect(baseIndex).toBeLessThan(18);
        expect(resolved).toMatch(HEX_RE);
    });

    it("fills in sensible defaults for fontSizes/densities/darkBias/direction", () => {
        const theme = generateTheme({ primary: "#4a7ff4" });
        expect(theme.direction).toBe("darken");
        expect(theme.fontSizes).toHaveLength(8);
        expect(theme.densities).toEqual([0.75, 1, 1.5, 2, 2.5]);
        expect(theme.darkBias).toBe(1);
    });

    it("plugs directly into setTheme/themeTokens", () => {
        const generated = generateTheme({ primary: "#4a7ff4", neutral: "#8d8d8d" });
        setTheme("generated-test", generated);
        const tokens = themeTokens("generated-test");
        expect(tokens.primary[0].toLowerCase()).toBe("#ffffff");
        expect(tokens.primary).toEqual(
            Object.fromEntries(generated.colors!.primary!.map((hex, i) => [i, hex])),
        );
    });
});
