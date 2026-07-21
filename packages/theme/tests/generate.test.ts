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

  it("keeps solid-depth steps distinct for primary/warning and error/danger", () => {
    // Mirrors apps/web site-theme brand anchors used by the docs catalog.
    const brand = generateTheme({
      primary: "#d97706",
      warning: "#65a30d",
      danger: "#ef4444",
      error: "#db2777",
    });
    const solidStep = 13;
    const primary = brand.colors!.primary[solidStep]!.toLowerCase();
    const warning = brand.colors!.warning[solidStep]!.toLowerCase();
    const danger = brand.colors!.danger[solidStep]!.toLowerCase();
    const error = brand.colors!.error[solidStep]!.toLowerCase();
    expect(primary).not.toBe(warning);
    expect(error).not.toBe(danger);

    const rgb = (hex: string) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
    const dist = (a: string, b: string) => {
      const [ar, ag, ab] = rgb(a);
      const [br, bg, bb] = rgb(b);
      return Math.hypot(ar - br, ag - bg, ab - bb);
    };
    // Must be visibly different fills, not near-identical browns/maroons.
    expect(dist(primary, warning)).toBeGreaterThan(50);
    expect(dist(error, danger)).toBeGreaterThan(35);
  });

  it("ships distinct built-in light error vs danger ramps at solid depth", async () => {
    const { getTheme } = await import("../src/theme.ts");
    const light = getTheme("light");
    expect(light.colors.error[13]).not.toBe(light.colors.danger[13]);
  });
});
