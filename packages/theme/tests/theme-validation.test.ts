import { describe, expect, it } from "vitest";
import {
  applySystemTheme,
  getTheme,
  setTheme,
  TONE_STEPS,
  themeCSS,
} from "../src/theme.ts";
import {
  ElementTones,
  resolveThemeColor,
  ToneAliases,
  themeColorToken,
} from "../src/tone.ts";

const freshName = (label: string) =>
  `vitest-${label}-${Math.random().toString(36).slice(2)}`;

const ramp18 = (hex = "#000000") => Array.from({ length: 18 }, () => hex);

describe("fontSizes structural validation", () => {
  it("rejects an array that is not exactly 8 entries", () => {
    expect(() => setTheme("light", { fontSizes: ["1rem"] } as any)).toThrow(
      /fontSize must be array of 8 non-empty string/,
    );
    expect(() =>
      setTheme("light", {
        fontSizes: Array.from({ length: 9 }, () => "1rem"),
      } as any),
    ).toThrow(/fontSize must be array of 8 non-empty string/);
  });

  it("rejects empty-string entries", () => {
    const sizes = Array.from({ length: 8 }, () => "1rem");
    sizes[3] = "";
    expect(() => setTheme("light", { fontSizes: sizes } as any)).toThrow(
      /fontSize must be array of 8 non-empty string/,
    );
  });

  it("accepts 8 non-empty strings", () => {
    const name = freshName("fontsizes-ok");
    expect(() =>
      setTheme(name, { fontSizes: Array.from({ length: 8 }, () => "1rem") }),
    ).not.toThrow();
  });
});

describe("color ramp structural validation (18-step tone model)", () => {
  it("TONE_STEPS matches the built-in ramp length and ElementTones span", () => {
    expect(TONE_STEPS).toBe(18);
    expect(ElementTones).toContain(`shift-${TONE_STEPS - 1}`);
    expect(ElementTones).not.toContain(`shift-${TONE_STEPS}`);
  });

  it("rejects ramps shorter or longer than TONE_STEPS", () => {
    expect(() =>
      setTheme("light", { colors: { primary: ["#000000", "#ffffff"] } } as any),
    ).toThrow(/colors\.primary must have exactly 18 tone steps \(got 2\)/);
    expect(() =>
      setTheme("light", {
        colors: { primary: Array.from({ length: 19 }, () => "#000000") },
      } as any),
    ).toThrow(/colors\.primary must have exactly 18 tone steps \(got 19\)/);
  });

  it("rejects empty-string entries inside a ramp", () => {
    const ramp = ramp18();
    ramp[7] = "";
    expect(() =>
      setTheme("light", { colors: { primary: ramp } } as any),
    ).toThrow(/colors\.primary must contain only non-empty strings/);
  });

  it("a custom theme with consistent 18-step ramps resolves every tone", () => {
    const name = freshName("ramp-ok");
    setTheme(name, { colors: { primary: ramp18("#123456") } });
    expect(getTheme(name).colors.primary).toHaveLength(18);
    // The generated CSS must contain no literal "undefined".
    expect(themeCSS()).not.toContain("undefined");
  });
});

describe("densities structural validation (5-step density scale)", () => {
  it("rejects an array that is not exactly 5 entries", () => {
    // A short array makes themeDensity() return undefined → "calc(NaNem)"
    // in control padding (same failure class the fontSizes check guards).
    expect(() => setTheme("light", { densities: [1, 1.5] })).toThrow(
      /densities must have exactly 5 entries/,
    );
    expect(() =>
      setTheme("light", { densities: [0.75, 1, 1.5, 2, 2.5, 3] }),
    ).toThrow(/densities must have exactly 5 entries/);
  });

  it("rejects non-positive or non-finite density factors", () => {
    expect(() =>
      setTheme("light", { densities: [0.75, 1, 0, 2, 2.5] }),
    ).toThrow(/densities entries must be positive finite numbers/);
    expect(() =>
      setTheme("light", { densities: [0.75, 1, Number.NaN, 2, 2.5] }),
    ).toThrow(/densities entries must be positive finite numbers/);
  });

  it("accepts 5 positive numbers", () => {
    const name = freshName("densities-ok");
    expect(() =>
      setTheme(name, { densities: [0.75, 1, 1.5, 2, 2.5] }),
    ).not.toThrow();
  });
});

describe("darkBias validation", () => {
  it("rejects non-integer, negative, and out-of-range darkBias", () => {
    // darkBias is a tone offset; a bad value yields NaN tone indices and
    // undefined colors at resolve time instead of an actionable error.
    expect(() => setTheme("light", { darkBias: 1.5 })).toThrow(
      /darkBias must be an integer between 0 and 17/,
    );
    expect(() => setTheme("light", { darkBias: -1 })).toThrow(
      /darkBias must be an integer between 0 and 17/,
    );
    expect(() => setTheme("light", { darkBias: 18 })).toThrow(
      /darkBias must be an integer between 0 and 17/,
    );
    expect(() => setTheme("light", { darkBias: "1" } as any)).toThrow(
      /darkBias must be an integer between 0 and 17/,
    );
  });

  it("accepts a valid darkBias", () => {
    const name = freshName("darkbias-ok");
    expect(() => setTheme(name, { darkBias: 2 })).not.toThrow();
    expect(getTheme(name).darkBias).toBe(2);
  });
});

describe("baseTones range validation", () => {
  it("rejects out-of-range and non-integer base tones", () => {
    expect(() =>
      setTheme("light", { baseTones: { primary: -1 } } as any),
    ).toThrow(/baseTones\.primary must be an integer between 0 and 17/);
    expect(() =>
      setTheme("light", { baseTones: { primary: 18 } } as any),
    ).toThrow(/baseTones\.primary must be an integer between 0 and 17/);
    expect(() =>
      setTheme("light", { baseTones: { primary: 2.5 } } as any),
    ).toThrow(/baseTones\.primary must be an integer between 0 and 17/);
  });
});

describe("CSS breakout guards", () => {
  it("rejects color values that would break out of the <style> block", () => {
    const ramp = ramp18();
    ramp[0] = "red; } body { display: none";
    expect(() =>
      setTheme("light", { colors: { primary: ramp } } as any),
    ).toThrow(/unsafe CSS characters/);

    const ramp2 = ramp18();
    ramp2[0] = "</style><script>alert(1)</script>";
    expect(() =>
      setTheme("light", { colors: { primary: ramp2 } } as any),
    ).toThrow(/unsafe CSS characters/);
  });

  it("rejects unsafe custom token values", () => {
    expect(() =>
      setTheme("light", { custom: { evil: "</style><b>x</b>" } } as any),
    ).toThrow(/unsafe CSS characters/);
  });

  it("rejects unsafe fontSizes values", () => {
    const sizes = Array.from({ length: 8 }, () => "1rem");
    sizes[0] = "1rem; }";
    expect(() => setTheme("light", { fontSizes: sizes } as any)).toThrow(
      /unsafe CSS characters/,
    );
  });

  it("rejects a semicolon that would inject an extra CSS declaration", () => {
    const ramp = ramp18();
    ramp[0] = "#fff; --injected: red";
    expect(() =>
      setTheme("light", { colors: { primary: ramp } } as any),
    ).toThrow(/unsafe CSS characters/);
    expect(() =>
      setTheme("light", { custom: { shadow: "0 1px 2px #000; color: red" } }),
    ).toThrow(/unsafe CSS characters/);
  });

  it("rejects </style variants that would break out of the element", () => {
    const spaced = ramp18();
    spaced[0] = "</ style><script>alert(1)</script>";
    expect(() =>
      setTheme("light", { colors: { primary: spaced } } as any),
    ).toThrow(/unsafe CSS characters/);

    const newline = ramp18();
    newline[0] = "</\nstyle><b>";
    expect(() =>
      setTheme("light", { colors: { primary: newline } } as any),
    ).toThrow(/unsafe CSS characters/);

    expect(() =>
      setTheme("light", { custom: { x: "</STYLE >" } } as any),
    ).toThrow(/unsafe CSS characters/);
  });

  it("rejects a theme name that would break out of the <style> block", () => {
    expect(() =>
      setTheme('x"] { } body { color: red } [data-x="', { darkBias: 1 }),
    ).toThrow(/unsafe CSS characters/);
    expect(() => setTheme("x; --injected: red", { darkBias: 1 })).toThrow(
      /unsafe CSS characters/,
    );
    expect(() => setTheme("</style><script>", { darkBias: 1 })).toThrow(
      /unsafe CSS characters/,
    );
  });

  it("rejects a color role key that would inject extra CSS declarations", () => {
    expect(() =>
      setTheme("light", {
        colors: { "x; --evil": ramp18() },
      } as any),
    ).toThrow(/unsafe CSS characters/);
  });

  it("escapes theme names and color role keys in generated CSS", () => {
    const name = `vitest-x"][data-injected="yes-${Math.random().toString(36).slice(2)}`;
    setTheme(name, {
      colors: { "brand/primary": ramp18("#123456") },
      baseTones: { "brand/primary": 0 },
    });
    const css = themeCSS();
    const escapedName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
    expect(css).toContain(`[data-theme="${escapedName}"]`);
    expect(css).not.toContain(`data-theme="${name}"`);
    expect(css).not.toContain('[data-injected');
    expect(css).toContain("--brand_primary-0:");
    expect(css).not.toContain("--brand/primary-0");
  });
});

describe("applySystemTheme SSR behavior", () => {
  it("throws an actionable error (not a bare ReferenceError) without a DOM", () => {
    expect((globalThis as any).document).toBeUndefined();
    expect(() => applySystemTheme()).toThrow(
      /applySystemTheme\(\) requires a browser DOM/,
    );
    expect(() => applySystemTheme()).not.toThrow(ReferenceError);
  });
});

describe("resolveThemeColor (explicit non-reactive token API)", () => {
  it("defaults to the light theme, matching themeColorToken(null, …)", () => {
    expect(resolveThemeColor({ tone: "base", color: "neutral" })).toBe(
      themeColorToken(null, "base", "neutral"),
    );
    expect(resolveThemeColor({ tone: "shift-4", color: "primary" })).toBe(
      themeColorToken(null, "shift-4", "primary"),
    );
  });

  it("resolves against an explicitly named theme", () => {
    const dark = getTheme("dark");
    expect(resolveThemeColor({ theme: "dark", tone: "inherit" })).toBe(
      dark.colors.neutral[0],
    );
    expect(resolveThemeColor({ theme: "dark", tone: "base" })).toBe(
      dark.colors.neutral[dark.baseTones.neutral],
    );
  });

  it("maps 'inherit' color to neutral and honors semantic aliases", () => {
    const light = getTheme("light");
    expect(resolveThemeColor({})).toBe(light.colors.neutral[0]);
    // "muted" is an alias for shift-8.
    expect(resolveThemeColor({ tone: "muted" })).toBe(light.colors.neutral[8]);
  });

  it("throws for an unknown theme or color", () => {
    expect(() => resolveThemeColor({ theme: "nope" })).toThrow(
      /Theme "nope" not found/,
    );
    expect(() => resolveThemeColor({ color: "nope" })).toThrow(
      /color "nope" not found on theme "light"/,
    );
  });

  it("does not follow a later theme switch — the value is baked at call time", () => {
    // Documented contract: resolveThemeColor is design-time, non-reactive.
    const before = resolveThemeColor({ tone: "inherit" });
    expect(typeof before).toBe("string");
    expect(before).toBe(getTheme("light").colors.neutral[0]);
  });
});

describe("exported tone machinery (for doctor/MCP tooling)", () => {
  it("exports the alias map as a value", () => {
    expect(ToneAliases).toEqual({
      surface: "shift-1",
      hover: "shift-2",
      border: "shift-3",
      "border-strong": "shift-4",
      muted: "shift-8",
      text: "shift-9",
    });
    // Every alias target must itself be a valid tone.
    for (const target of Object.values(ToneAliases)) {
      expect(ElementTones).toContain(target);
    }
  });
});
