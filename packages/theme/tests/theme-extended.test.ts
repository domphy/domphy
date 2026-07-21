import { afterEach, describe, expect, it, vi } from "vitest";
import { themeDensity } from "../src/density.ts";
import { themeSize } from "../src/size.ts";
import {
  getTheme,
  setTheme,
  themeApply,
  themeCSS,
  themeTokens,
  themeVars,
} from "../src/theme.ts";
import { themeColor, themeColorToken } from "../src/tone.ts";

function createAttributes(values: Record<string, string> = {}) {
  return {
    get: (key: string) => values[key],
    has: (key: string) => Object.hasOwn(values, key),
    addListener: vi.fn(),
  };
}

function createNode(values: Record<string, string> = {}, parent: any = null) {
  return { parent, attributes: createAttributes(values) };
}

// Minimal DOM stub so themeApply (which guards on `typeof document`) can run in
// the default node test environment without pulling in jsdom.
function createStyleElement() {
  return { id: "", textContent: "" as string };
}

function installDocumentStub() {
  const byId = new Map<string, any>();
  // Set semantics mirror the real DOM: appending a node already in the tree is
  // a move, not a duplicate, so the head holds each element at most once.
  const head = new Set<any>();
  const documentStub = {
    getElementById: (id: string) => byId.get(id) ?? null,
    createElement: (_tag: string) => createStyleElement(),
    head: {
      appendChild: (element: any) => {
        head.add(element);
        if (element.id) byId.set(element.id, element);
        return element;
      },
    },
  };
  (globalThis as any).document = documentStub;
  return { documentStub, head };
}

describe("themeColorToken (resolved-value form)", () => {
  it("resolves the light-theme base tone without a node context", () => {
    const light = getTheme("light");
    expect(themeColorToken(null, "base", "neutral")).toBe(
      light.colors.neutral[light.baseTones.neutral],
    );
  });

  it("resolves an inherited tone to an actual hex value", () => {
    expect(themeColorToken(null, "inherit", "neutral")).toBe(
      getTheme("light").colors.neutral[0],
    );
  });

  it("defaults the color to neutral when 'inherit' is passed", () => {
    expect(themeColorToken(null, "inherit", "inherit")).toBe(
      themeColorToken(null, "inherit", "neutral"),
    );
  });

  it("resolves through a node's inherited dataTone and theme", () => {
    const themeRoot = createNode({ dataTheme: "dark" });
    const toneRoot = createNode({ dataTone: "increase-1" }, themeRoot);
    const node = createNode({}, toneRoot);
    const dark = getTheme("dark");
    // Inherited increase-1 makes context tone 1 (not 0), so darkBias does not
    // apply; the resolved tone is 1.
    expect(themeColorToken(node as any, "inherit", "neutral")).toBe(
      dark.colors.neutral[1],
    );
  });
});

describe("darkBias / biasContext reactive behavior", () => {
  it("shifts a dark-theme context-0 element by darkBias", () => {
    const dark = getTheme("dark");
    expect(dark.direction).toBe("lighten");
    expect(dark.darkBias).toBeGreaterThan(0);

    const darkRoot = createNode({ dataTheme: "dark" });
    const child = createNode({}, darkRoot);
    // context 0 + lighten + darkBias=1 -> tone 1.
    expect(themeColor(child as any, "inherit", "neutral")).toBe(
      "var(--neutral-1)",
    );
    expect(themeColorToken(child as any, "inherit", "neutral")).toBe(
      dark.colors.neutral[dark.darkBias],
    );
  });

  it("does NOT shift a light-theme context-0 element", () => {
    expect(getTheme("light").direction).toBe("darken");

    const lightRoot = createNode({ dataTheme: "light" });
    const child = createNode({}, lightRoot);
    expect(themeColor(child as any, "inherit", "neutral")).toBe(
      "var(--neutral-0)",
    );
    expect(themeColorToken(child as any, "inherit", "neutral")).toBe(
      getTheme("light").colors.neutral[0],
    );
  });
});

describe("themeApply DOM injection", () => {
  afterEach(() => {
    delete (globalThis as any).document;
  });

  it("is a no-op when no document is available", () => {
    expect((globalThis as any).document).toBeUndefined();
    expect(() => themeApply()).not.toThrow();
  });

  it("creates and reuses a single #domphy-themes style tag", () => {
    const { head } = installDocumentStub();

    themeApply();
    expect(head.size).toBe(1);
    const styleElement = [...head][0];
    expect(styleElement.id).toBe("domphy-themes");
    expect(styleElement.textContent).toBe(themeCSS());

    // Second call must reuse the existing tag, not create a new one.
    themeApply();
    expect(head.size).toBe(1);
    expect([...head][0]).toBe(styleElement);
  });

  it("writes into a caller-provided style element without touching the head", () => {
    const { head } = installDocumentStub();
    const provided = createStyleElement();
    themeApply(provided as any);
    expect(provided.textContent).toBe(themeCSS());
    expect(head.size).toBe(0);
  });
});

describe("cache invalidation and reuse", () => {
  it("themeVars returns the same cached object on repeated calls", () => {
    const first = themeVars();
    const second = themeVars();
    expect(second).toBe(first);
  });

  it("themeTokens reflects values written by setTheme after cache invalidation", () => {
    const name = `vitest-cache-${Math.random().toString(36).slice(2)}`;
    setTheme(name, { custom: { gap: "1px" } });
    const before = themeTokens(name);
    expect(before.custom.gap).toBe("1px");

    // setTheme must clear the per-name token cache so the new value appears.
    setTheme(name, { custom: { gap: "2px" } });
    const after = themeTokens(name);
    expect(after.custom.gap).toBe("2px");
    expect(after).not.toBe(before);
  });

  it("themeVars cache survives setTheme on an unrelated theme but is dropped after a structural setTheme", () => {
    const cached = themeVars();
    expect(themeVars()).toBe(cached);
    // setTheme always invalidates the var cache (it cannot know if structure changed).
    setTheme("light", {});
    expect(themeVars()).not.toBe(cached);
  });
});

describe("deepMerge via setTheme", () => {
  it("merges nested objects without dropping sibling keys", () => {
    const name = `vitest-merge-${Math.random().toString(36).slice(2)}`;
    setTheme(name, { custom: { a: "1" } });
    setTheme(name, { custom: { b: "2" } });
    const theme = getTheme(name);
    expect(theme.custom.a).toBe("1");
    expect(theme.custom.b).toBe("2");
  });

  it("overwrites array values wholesale rather than index-merging", () => {
    const name = `vitest-merge-arr-${Math.random().toString(36).slice(2)}`;
    setTheme(name, { densities: [0.5, 1, 1.5, 2, 2.5] });
    setTheme(name, { densities: [1, 1, 1, 1, 1] });
    expect(getTheme(name).densities).toEqual([1, 1, 1, 1, 1]);
  });

  it("does not pollute Object.prototype via a JSON.parse'd __proto__ key (security regression)", () => {
    const name = `vitest-merge-proto-${Math.random().toString(36).slice(2)}`;
    // JSON.parse produces an own enumerable "__proto__" key, unlike
    // object-literal syntax, so this reproduces the real attack vector.
    const payload = JSON.parse(
      '{"custom": {"__proto__": {"polluted": "yes"}}}',
    );
    setTheme(name, payload);
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("does not let constructor/prototype keys escape the merge target", () => {
    const name = `vitest-merge-ctor-${Math.random().toString(36).slice(2)}`;
    const payload = JSON.parse(
      '{"custom": {"constructor": {"polluted": "yes"}}}',
    );
    setTheme(name, payload);
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe("validateTheme errors", () => {
  it("rejects an unknown top-level key", () => {
    expect(() => setTheme("light", { nope: 1 } as any)).toThrow(/Invalid key/);
  });

  it("rejects a non-array fontSizes", () => {
    expect(() => setTheme("light", { fontSizes: "big" } as any)).toThrow(
      /fontSize must be array/,
    );
  });

  it("rejects densities that are not an array of numbers", () => {
    expect(() => setTheme("light", { densities: "dense" } as any)).toThrow(
      /densities must be array of number/,
    );
    expect(() => setTheme("light", { densities: [1, "2", 3] } as any)).toThrow(
      /densities must be array of number/,
    );
  });

  it("rejects a non-object custom value", () => {
    expect(() => setTheme("light", { custom: "x" } as any)).toThrow(
      /custom property: must be an object/,
    );
    expect(() => setTheme("light", { custom: null } as any)).toThrow(
      /custom property: must be an object/,
    );
  });

  it("rejects a colors value that is not an object of string[]", () => {
    expect(() => setTheme("light", { colors: null } as any)).toThrow(
      /colors must be an object/,
    );
    expect(() => setTheme("light", { colors: "x" } as any)).toThrow(
      /colors must be an object/,
    );
    expect(() =>
      setTheme("light", { colors: { primary: "not-an-array" } } as any),
    ).toThrow(/colors must be an object/);
    expect(() =>
      setTheme("light", { colors: { primary: [1, 2, 3] } } as any),
    ).toThrow(/colors must be an object/);
  });

  it("rejects a baseTones value that is not an object of number", () => {
    expect(() => setTheme("light", { baseTones: null } as any)).toThrow(
      /baseTones must be an object of number/,
    );
    expect(() =>
      setTheme("light", { baseTones: { primary: "9" } } as any),
    ).toThrow(/baseTones must be an object of number/);
  });

  it("rejects a direction value other than 'lighten'/'darken'", () => {
    expect(() => setTheme("light", { direction: "sideways" } as any)).toThrow(
      /direction must be "lighten" or "darken"/,
    );
  });

  it("accepts a well-formed colors/baseTones/direction partial without throwing", () => {
    // Uses a fresh theme name (not "light"/"dark") — those are module-level
    // singletons shared across the whole test file.
    const name = `vitest-validate-ok-${Math.random().toString(36).slice(2)}`;
    expect(() =>
      setTheme(name, {
        colors: { primary: ["#000000", "#ffffff"] },
        baseTones: { primary: 0 },
        direction: "lighten",
      } as any),
    ).not.toThrow();
  });
});

describe("shiftTone branches via themeColor", () => {
  it("shifts tones at or below the midpoint upward (toward darker)", () => {
    // context 0 (<= midpoint 8) + shift-3 -> tone 3.
    expect(themeColor(null, "shift-3", "primary")).toBe("var(--primary-3)");
  });

  it("shifts tones above the midpoint downward (inverted branch)", () => {
    // context 12 (> midpoint 8) + shift-3 -> 12 - 3 = 9.
    const ctx = createNode({ dataTone: "increase-12" });
    const node = createNode({}, ctx);
    expect(themeColor(node as any, "shift-3", "primary")).toBe(
      "var(--primary-9)",
    );
  });
});

describe("offsetSize / offsetDensity clamping", () => {
  it("clamps size at the upper bound (index 7)", () => {
    const ctx = createNode({ dataSize: "increase-7" });
    const node = createNode({}, ctx);
    // context 2 + increase-7 = 9 -> clamp to 7.
    expect(themeSize(node as any, "increase-7")).toBe("var(--fontSize-7)");
  });

  it("clamps size at the lower bound (index 0)", () => {
    const ctx = createNode({ dataSize: "decrease-7" });
    const node = createNode({}, ctx);
    // context 2 + decrease-7 = -5 -> clamp to 0.
    expect(themeSize(node as any, "decrease-7")).toBe("var(--fontSize-0)");
  });

  it("clamps density at the upper bound (index 4)", () => {
    // Density names only span 0..4 (ElementDensities). increase-4 from the
    // context default of 2 reaches 6, which clamps to the max index 4.
    const ctx = createNode({ dataDensity: "increase-4" });
    const node = createNode({}, ctx);
    expect(themeDensity(node as any)).toBe(getTheme("light").densities[4]);
  });

  it("clamps density at the lower bound (index 0)", () => {
    // decrease-4 from the context default of 2 reaches -2, which clamps to 0.
    const ctx = createNode({ dataDensity: "decrease-4" });
    const node = createNode({}, ctx);
    expect(themeDensity(node as any)).toBe(getTheme("light").densities[0]);
  });
});
