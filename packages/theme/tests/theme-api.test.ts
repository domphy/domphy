import { describe, expect, it, vi } from "vitest";
import {
  createDark,
  getTheme,
  setTheme,
  themeCSS,
  themeName,
  themeSpacing,
  themeTokens,
  themeVars,
} from "../src/theme.ts";
import { themeDensity } from "../src/density.ts";
import { contextColor, themeColor } from "../src/tone.ts";
import { themeSize } from "../src/size.ts";

function createAttributes(values: Record<string, string> = {}) {
  return {
    get: (key: string) => values[key],
    has: (key: string) => Object.prototype.hasOwnProperty.call(values, key),
    onChange: vi.fn(),
  };
}

function createNode(
  values: Record<string, string> = {},
  parent: any = null,
  context: Record<string, unknown> = {},
) {
  return {
    parent,
    attributes: createAttributes(values),
    getContext: (key: string) => context[key],
  };
}

describe("theme core APIs", () => {
  it("createDark reverses palettes and base tones", () => {
    const light = getTheme("light");
    const dark = createDark(structuredClone(light));
    const lastPrimaryIndex = light.colors.primary.length - 1;

    expect(dark.direction).toBe("lighten");
    expect(dark.colors.primary[0]).toBe(light.colors.primary[lastPrimaryIndex]);
    expect(dark.baseTones.primary).toBe(lastPrimaryIndex - light.baseTones.primary);
  });

  it("setTheme/getTheme merge custom themes and reject invalid keys", () => {
    const customThemeName = `vitest-${Math.random().toString(36).slice(2)}`;
    setTheme(customThemeName, { custom: { "radius/sm": "2px" } });

    const customTheme = getTheme(customThemeName);
    expect(customTheme.custom["radius/sm"]).toBe("2px");

    const css = themeCSS();
    expect(css).toContain(`[data-theme="${customThemeName}"]`);
    expect(css).toContain("--custom-radius_sm: 2px;");

    expect(() => setTheme(customThemeName, { badKey: "x" } as any)).toThrow(/Invalid key/);
  });

  it("returns stable token and var structures", () => {
    const vars = themeVars();
    const tokens = themeTokens("light");
    const light = getTheme("light");

    expect(vars.primary[0]).toBe("var(--primary-0)");
    expect(vars.fontSizes[2]).toBe("var(--fontSize-2)");
    expect(tokens.primary[6]).toBe(light.colors.primary[6]);
    expect(tokens.densities[2]).toBe(light.densities[2]);
  });

  it("computes spacing in em units", () => {
    expect(themeSpacing(6)).toBe("1.5em");
    expect(themeSpacing(1)).toBe("0.25em");
  });
});

describe("theme size/tone helpers", () => {
  it("resolves themeName from parent and subscribes listener to dataTheme changes", () => {
    const root = createNode({ dataTheme: "dark" });
    const child = createNode({}, root);

    const listener = Object.assign(vi.fn(), { elementNode: child });
    const resolved = themeName(listener as any);

    expect(resolved).toBe("dark");
    expect(root.attributes.onChange).toHaveBeenCalledWith("dataTheme", listener);
  });

  it("resolves size from inherited dataSize and local offset", () => {
    const root = createNode({ dataSize: "increase-2" });
    const child = createNode({}, root);

    expect(themeSize(child as any, "decrease-1")).toBe("var(--fontSize-3)");
    expect(() => themeSize(child as any, "invalid-size" as any)).toThrow(/size name/);
  });

  it("resolves density factor from inherited dataDensity", () => {
    const root = createNode({ dataDensity: "increase-2" });
    const child = createNode({}, root);

    expect(themeDensity(child as any)).toBe(2.5);
    expect(themeSpacing(themeDensity(child as any) * 3)).toBe("1.875em");
  });

  it("resolves tone/color via inherit, base, and context color", () => {
    const themeRoot = createNode({ dataTheme: "dark" });
    const toneRoot = createNode({ dataTone: "increase-1" }, themeRoot);
    const node = createNode({}, toneRoot, { themeColor: "success" });

    expect(themeColor(node as any, "inherit", "neutral")).toBe("var(--neutral-1)");
    expect(themeColor(node as any, "base", "primary")).toBe("var(--primary-5)");
    expect(contextColor(node as any, "inherit")).toBe("var(--success-1)");

    expect(themeColor(null, "shift-2", "primary")).toBe("var(--primary-2)");
    expect(() => themeColor(null, "bad-tone" as any, "primary")).toThrow(/tone name/);
  });
});
