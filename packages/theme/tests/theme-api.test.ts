import { describe, expect, it, vi } from "vitest";
import { themeDensity } from "../src/density.ts";
import { themeSize } from "../src/size.ts";
import {
  COLOR_ROLES,
  getTheme,
  setTheme,
  themeCSS,
  themeName,
  themeSpacing,
  themeTokens,
  themeVars,
} from "../src/theme.ts";
import { ElementTones, themeColor, themeColorToken } from "../src/tone.ts";

function createAttributes(values: Record<string, string> = {}) {
  return {
    get: (key: string) => values[key],
    has: (key: string) => Object.hasOwn(values, key),
    addListener: vi.fn(),
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
  it("every color family has a baseTones entry (regression: attention was missing)", () => {
    const light = getTheme("light");
    for (const name of Object.keys(light.colors)) {
      expect(light.baseTones[name], `baseTones.${name}`).toBeTypeOf("number");
      expect(light.colors[name][light.baseTones[name]]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("dark theme has reversed palettes and base tones", () => {
    const light = getTheme("light");
    const dark = getTheme("dark");
    const lastPrimaryIndex = light.colors.primary.length - 1;

    expect(dark.direction).toBe("lighten");
    expect(dark.colors.primary[0]).toBe(light.colors.primary[lastPrimaryIndex]);
    expect(dark.baseTones.primary).toBe(
      lastPrimaryIndex - light.baseTones.primary,
    );
  });

  it("setTheme/getTheme merge custom themes and reject invalid keys", () => {
    const customThemeName = `vitest-${Math.random().toString(36).slice(2)}`;
    setTheme(customThemeName, { custom: { "radius/sm": "2px" } });

    const customTheme = getTheme(customThemeName);
    expect(customTheme.custom["radius/sm"]).toBe("2px");

    const css = themeCSS();
    expect(css).toContain(`[data-theme="${customThemeName}"]`);
    expect(css).toContain("--custom-radius_sm: 2px;");

    expect(() => setTheme(customThemeName, { badKey: "x" } as any)).toThrow(
      /Invalid key/,
    );
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
    expect(themeSpacing(6)).toBe("calc(1.5em)");
    expect(themeSpacing(1)).toBe("calc(0.25em)");
  });
});

describe("theme size/tone helpers", () => {
  it("resolves themeName from parent and subscribes listener to dataTheme changes", () => {
    const root = createNode({ dataTheme: "dark" });
    const child = createNode({}, root);

    const listener = Object.assign(vi.fn(), { elementNode: child });
    const resolved = themeName(listener as any);

    expect(resolved).toBe("dark");
    expect(root.attributes.addListener).toHaveBeenCalledWith(
      "dataTheme",
      listener,
    );
  });

  it("resolves size from inherited dataSize and local offset", () => {
    const root = createNode({ dataSize: "increase-2" });
    const child = createNode({}, root);

    expect(themeSize(child as any, "decrease-1")).toBe("var(--fontSize-3)");
    expect(() => themeSize(child as any, "invalid-size" as any)).toThrow(
      /size name/,
    );
  });

  it("resolves density factor from inherited dataDensity", () => {
    const root = createNode({ dataDensity: "increase-2" });
    const child = createNode({}, root);

    expect(themeDensity(child as any)).toBe(2.5);
    expect(themeSpacing(themeDensity(child as any) * 3)).toBe("calc(1.875em)");
  });

  it("resolves tone/color via inherit and base", () => {
    const themeRoot = createNode({ dataTheme: "dark" });
    const toneRoot = createNode({ dataTone: "increase-1" }, themeRoot);
    const node = createNode({}, toneRoot);

    expect(themeColor(node as any, "inherit", "neutral")).toBe(
      "var(--neutral-1)",
    );
    // dark primary base = lastIndex(17) - light base(9) = 8 (see dark-derivation test above)
    expect(themeColor(node as any, "base", "primary")).toBe("var(--primary-8)");

    expect(themeColor(null, "shift-2", "primary")).toBe("var(--primary-2)");
    expect(() => themeColor(null, "bad-tone" as any, "primary")).toThrow(
      /tone name/,
    );
  });

  it("resolves 'base' tone without a node context (light theme base tone)", () => {
    expect(themeColor(null, "base", "primary")).toBe("var(--primary-9)");
    expect(themeColor(null, "base", "neutral")).toBe("var(--neutral-8)");
  });

  it("throws a domain Error (not a raw TypeError) for an unknown color name, with or without node context", () => {
    expect(() => themeColor(null, "inherit", "totally-bogus-color")).toThrow(
      /color "totally-bogus-color" not found on theme "light"/,
    );
    const node = createNode({});
    expect(() => themeColor(node as any, "inherit", "totally-bogus-color")).toThrow(
      /color "totally-bogus-color" not found on theme "light"/,
    );
    expect(() =>
      themeColorToken(null, "inherit", "totally-bogus-color"),
    ).toThrow(/color "totally-bogus-color" not found on theme "light"/);
    expect(() =>
      themeColorToken(node as any, "inherit", "totally-bogus-color"),
    ).toThrow(/color "totally-bogus-color" not found on theme "light"/);
  });

  it("clamps shift overshoot to the far boundary instead of flipping to the opposite extreme", () => {
    // context 8 (midpoint) + shift-12 overshoots to 20 -> clamp to 17, NOT flip to 0
    const ctx = createNode({ dataTone: "increase-8" });
    const node = createNode({}, ctx);
    expect(themeColor(node as any, "shift-12", "primary")).toBe(
      "var(--primary-17)",
    );
    expect(themeColor(node as any, "shift-12", "primary")).not.toBe(
      "var(--primary-0)",
    );
  });
});

describe("theme CSS generation hygiene", () => {
  it("does not emit baseTones/direction/darkBias as CSS custom properties", () => {
    const css = themeCSS();
    expect(css).not.toContain("baseTones");
    expect(css).not.toContain("--direction");
    expect(css).not.toContain("--darkBias");
  });

  it("escapes every illegal char in custom token keys (not just the first slash)", () => {
    const name = `vitest-esc-${Math.random().toString(36).slice(2)}`;
    setTheme(name, { custom: { "radius/sm/lg": "3px", "gap x": "1px" } });
    const css = themeCSS();
    expect(css).toContain("--custom-radius_sm_lg: 3px;");
    expect(css).toContain("--custom-gap_x: 1px;");
    expect(css).not.toMatch(/--custom-radius_sm\/lg/);
  });

  it("themeVars exposes only colors/fontSizes/custom (no phantom metadata sections)", () => {
    const vars = themeVars() as Record<string, unknown>;
    expect(vars.baseTones).toBeUndefined();
    expect(vars.direction).toBeUndefined();
    expect(vars.darkBias).toBeUndefined();
    expect(vars.primary).toBeDefined();
    expect(vars.fontSizes).toBeDefined();
  });
});

// Semantic tone aliases (surface/hover/border/border-strong/muted/text) are
// sugar over the existing shift-N machinery — see packages/theme/src/tone.ts
// for the mapping and the evidence behind each choice.
describe("semantic tone aliases", () => {
  const ALIASES: Record<string, string> = {
    surface: "shift-1",
    hover: "shift-2",
    border: "shift-3",
    "border-strong": "shift-4",
    muted: "shift-8",
    text: "shift-9",
  };

  it("ElementTones includes every alias name", () => {
    for (const alias of Object.keys(ALIASES)) {
      expect(ElementTones).toContain(alias);
    }
  });

  it("resolves each alias to the same value as its shift-N equivalent (no node context, light theme)", () => {
    for (const [alias, shift] of Object.entries(ALIASES)) {
      expect(themeColor(null, alias as any, "primary")).toBe(
        themeColor(null, shift as any, "primary"),
      );
    }
  });

  it("resolves each alias to the same value as its shift-N equivalent (with a dataTone node context)", () => {
    const toneRoot = createNode({ dataTone: "increase-2" });
    for (const [alias, shift] of Object.entries(ALIASES)) {
      const aliasNode = createNode({}, toneRoot);
      const shiftNode = createNode({}, toneRoot);
      expect(themeColor(aliasNode as any, alias as any, "primary")).toBe(
        themeColor(shiftNode as any, shift as any, "primary"),
      );
    }
  });

  it("resolves identically in the dark theme too", () => {
    const themeRoot = createNode({ dataTheme: "dark" });
    for (const [alias, shift] of Object.entries(ALIASES)) {
      const aliasNode = createNode({}, themeRoot);
      const shiftNode = createNode({}, themeRoot);
      expect(themeColor(aliasNode as any, alias as any, "primary")).toBe(
        themeColor(shiftNode as any, shift as any, "primary"),
      );
    }
  });

  it("themeColorToken resolves aliases identically to their shift-N equivalent", () => {
    for (const [alias, shift] of Object.entries(ALIASES)) {
      expect(themeColorToken(null, alias as any, "primary")).toBe(
        themeColorToken(null, shift as any, "primary"),
      );
    }
  });

  it("dataTone itself accepts an alias (context-shift, not just color/token calls)", () => {
    const aliasRoot = createNode({ dataTone: "border-strong" });
    const shiftRoot = createNode({ dataTone: "shift-4" });
    const aliasChild = createNode({}, aliasRoot);
    const shiftChild = createNode({}, shiftRoot);
    expect(themeColor(aliasChild as any, "inherit", "primary")).toBe(
      themeColor(shiftChild as any, "inherit", "primary"),
    );
  });
});

// COLOR_ROLES is the single source of truth for the 10 built-in semantic role
// names — both the ColorRole type (theme.ts, gives ThemeColor its autocomplete)
// and every consumer that needs a runtime list (e.g. the Theme Builder demo's
// color-picker sidebar) derive from this ONE array. A drift between this array
// and the actual `light` theme's registered colors would silently break that
// autocomplete guarantee without failing any other test.
describe("COLOR_ROLES", () => {
  it("matches the light theme's registered color keys exactly (order-independent)", () => {
    const registered = Object.keys(getTheme("light").colors).sort();
    expect([...COLOR_ROLES].sort()).toEqual(registered);
  });

  it("has no duplicate entries", () => {
    expect(new Set(COLOR_ROLES).size).toBe(COLOR_ROLES.length);
  });
});
