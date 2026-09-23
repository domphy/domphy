import { describe, expect, it } from "vitest";
import {
  CONTRAST_SPAN,
  ElementTones,
  getTheme,
  resolveThemeColor,
  resolveToneStep,
  TONE_STEPS,
  textToneOn,
  textToneOnRampEdge,
} from "../src/index.ts";

// WCAG 2.1 relative-luminance contrast math (same formula as contrast.test.ts
// and DESIGN.md §2.1) — the external truth this file measures against.
function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * srgbToLinear(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * srgbToLinear(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * srgbToLinear(parseInt(hex.slice(5, 7), 16))
  );
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const STEPS = [...Array(TONE_STEPS).keys()];

// Minimal ElementNode-shaped mock (same shape contextTone()/themeName() walk:
// `.parent` + `.attributes.get/has`) — no dataTone/dataTheme override, so
// context stays 0 (the ambient default surface), matching what the unbiased
// form's own docs assume.
function createNode(dataTheme?: string) {
  const values: Record<string, string> = dataTheme ? { dataTheme } : {};
  return {
    parent: null,
    attributes: {
      get: (key: string) => values[key],
      has: (key: string) => Object.hasOwn(values, key),
      addListener: () => {},
    },
  } as never;
}

describe("textToneOn() domain (tone grammar: shift-0 … shift-17)", () => {
  it("returns a real tone name for every ramp step, and for out-of-range input", () => {
    for (const step of STEPS) {
      expect(ElementTones).toContain(textToneOn(step));
    }
    // Out of domain: clamped onto the ramp rather than emitting "shift-21" /
    // "shift--3", which offsetTone() rejects with `tone name … invalid`.
    for (const bad of [-5, -1, TONE_STEPS, 42, 2.4]) {
      expect(ElementTones).toContain(textToneOn(bad));
    }
  });
});

describe("textToneOn() contrast (WCAG 2.1 4.5:1 on the built-in themes)", () => {
  for (const theme of ["light", "dark"]) {
    const roles = Object.keys(getTheme(theme).colors);
    // A theme's edge `darkBias` lifts the resolution context off the ramp end,
    // so the K-step partner of a fill near the far end clamps. The loss is at
    // most `darkBias` steps — anything more would mean the direction pick sent
    // the label the wrong way.
    const { darkBias } = getTheme(theme);

    it(`${theme}: label lands CONTRAST_SPAN steps off the fill (±darkBias clamp)`, () => {
      for (const fill of STEPS) {
        const fillStep = resolveToneStep({ theme, tone: `shift-${fill}` });
        const textStep = resolveToneStep({ theme, tone: textToneOn(fill) });
        const distance = Math.abs(textStep - fillStep);
        expect(
          distance,
          `${theme} fill shift-${fill} (step ${fillStep}) -> ${textToneOn(fill)} (step ${textStep})`,
        ).toBeGreaterThanOrEqual(CONTRAST_SPAN - darkBias);
      }
    });

    it(`${theme}: clears 4.5:1 on every role wherever the full K-step gap is reachable`, () => {
      for (const fill of STEPS) {
        const tone = textToneOn(fill);
        const fillStep = resolveToneStep({ theme, tone: `shift-${fill}` });
        const textStep = resolveToneStep({ theme, tone });
        if (Math.abs(textStep - fillStep) < CONTRAST_SPAN) continue;
        for (const color of roles) {
          const ratio = contrastRatio(
            resolveThemeColor({ theme, tone: `shift-${fill}`, color }),
            resolveThemeColor({ theme, tone, color }),
          );
          expect(
            ratio,
            `${theme}.${color}: label ${tone} on fill shift-${fill}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});

// The object-aware overload resolves the fill's REAL post-darkBias ramp step
// (the same one themeColor() paints) and returns an absolute index, so it
// clears AA for EVERY fill — no `continue` skip for an unreachable gap,
// unlike the relative shift-N form proven above.
describe("textToneOn(fill, object) — bias-aware form has no AA gap", () => {
  for (const theme of ["light", "dark"]) {
    const roles = Object.keys(getTheme(theme).colors);
    const node = createNode(theme === "dark" ? "dark" : undefined);

    it(`${theme}: clears 4.5:1 on every role for every fill (0…${TONE_STEPS - 1})`, () => {
      for (const fill of STEPS) {
        const tone = textToneOn(fill, node);
        for (const color of roles) {
          const ratio = contrastRatio(
            resolveThemeColor({ theme, tone: `shift-${fill}`, color }),
            resolveThemeColor({ theme, tone, color }),
          );
          expect(
            ratio,
            `${theme}.${color}: label ${JSON.stringify(tone)} on fill shift-${fill}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});

describe("textToneOnRampEdge(fillTone, object) — end-of-ramp label for a fixed fill", () => {
  for (const theme of ["light", "dark"]) {
    const roles = Object.keys(getTheme(theme).colors);
    const node = createNode(theme === "dark" ? "dark" : undefined);

    it(`${theme}: clears 4.5:1 on every role for every "shift-N" fill (0…${TONE_STEPS - 1})`, () => {
      for (const fill of STEPS) {
        const fillTone = `shift-${fill}`;
        const labelTone = textToneOnRampEdge(fillTone, node);
        for (const color of roles) {
          const ratio = contrastRatio(
            resolveThemeColor({ theme, tone: fillTone, color }),
            resolveThemeColor({ theme, tone: labelTone, color }),
          );
          expect(
            ratio,
            `${theme}.${color}: label ${JSON.stringify(labelTone)} on fill ${fillTone}`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    // Regression: measured 3.88:1 (dark, success, fill shift-8) before this
    // function resolved fillTone's REAL post-darkBias step instead of
    // treating "shift-N" as a literal ramp index.
    it(`${theme}: the ramp midpoint fill (the case darkBias distorts) still clears 4.5:1`, () => {
      const midpoint = Math.floor((TONE_STEPS - 1) / 2);
      const labelTone = textToneOnRampEdge(`shift-${midpoint}`, node);
      for (const color of roles) {
        const ratio = contrastRatio(
          resolveThemeColor({ theme, tone: `shift-${midpoint}`, color }),
          resolveThemeColor({ theme, tone: labelTone, color }),
        );
        expect(ratio, `${theme}.${color}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("non-shift-N tone (alias/custom string) falls back to the dark edge (shift-N clamps to the true edge under any context, so a string is safe here even with object)", () => {
    expect(textToneOnRampEdge("muted")).toBe("shift-17");
    expect(textToneOnRampEdge("muted", createNode())).toBe("shift-17");
    expect(textToneOnRampEdge("muted", createNode("dark"))).toBe("shift-17");
  });

  it("without object, matches the unbiased-space estimate (exact on the light theme's default surface)", () => {
    expect(textToneOnRampEdge("shift-2")).toBe("shift-17");
    expect(textToneOnRampEdge("shift-12")).toBe("shift-0");
  });
});
