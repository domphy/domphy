import { describe, expect, it } from "vitest";
import { getTheme, setTheme, themeCSS } from "../src/theme.ts";
import {
  FONT_FAMILIES,
  FONT_WEIGHTS,
  LETTER_SPACINGS,
  themeFont,
  themeLetterSpacing,
  themeWeight,
} from "../src/typography.ts";

const freshName = (label: string) =>
  `vitest-${label}-${Math.random().toString(36).slice(2)}`;

describe("named typography tokens are interpolated into <style> — same injection contract as colors/custom", () => {
  for (const group of [
    "fontFamilies",
    "fontWeights",
    "letterSpacings",
  ] as const) {
    it(`${group}: rejects a value that would break out of the <style> element`, () => {
      expect(() =>
        setTheme(freshName(group), {
          [group]: { evil: "</style><script>alert(1)</script>" },
        } as never),
      ).toThrow(/unsafe CSS characters/);
      expect(() =>
        setTheme(freshName(group), {
          [group]: { evil: "400; color: red" },
        } as never),
      ).toThrow(/unsafe CSS characters/);
    });

    it(`${group}: rejects a NAME that would break out of the <style> element`, () => {
      expect(() =>
        setTheme(freshName(group), {
          [group]: { "x;}\nbody{display:none": "400" },
        } as never),
      ).toThrow(/unsafe CSS characters/);
    });

    it(`${group}: rejects a non-string or empty value`, () => {
      expect(() =>
        setTheme(freshName(group), { [group]: { x: 400 } } as never),
      ).toThrow(new RegExp(`${group}\\.x must be a non-empty string`));
      expect(() =>
        setTheme(freshName(group), { [group]: { x: "" } } as never),
      ).toThrow(new RegExp(`${group}\\.x must be a non-empty string`));
      expect(() =>
        setTheme(freshName(group), { [group]: ["400"] } as never),
      ).toThrow(new RegExp(`${group} must be an object of non-empty strings`));
    });
  }
});

describe("accessors fail loud on an unregistered name (documented contract)", () => {
  it("names the accessor, the known names, and the setTheme call that fixes it", () => {
    expect(() => themeWeight("heavyish")).toThrow(
      /fontWeights\.heavyish is not registered .*Known names: .*semibold.*setTheme/s,
    );
    expect(() => themeFont("comic")).toThrow(/fontFamilies\.comic/);
    expect(() => themeLetterSpacing("loose")).toThrow(/letterSpacings\.loose/);
  });

  it("every name in the exported lists resolves", () => {
    for (const family of FONT_FAMILIES)
      expect(themeFont(family)).toBe(`var(--fontFamily-${family})`);
    for (const weight of FONT_WEIGHTS)
      expect(themeWeight(weight)).toBe(`var(--fontWeight-${weight})`);
    for (const spacing of LETTER_SPACINGS)
      expect(themeLetterSpacing(spacing)).toBe(
        `var(--letterSpacing-${spacing})`,
      );
  });
});

describe("the themed root carries a font stack (CSS inheritance: without it the document falls back to the UA serif)", () => {
  // Theme values can never contain "}" (assertCssSafe), so splitting on it
  // yields exactly one entry per rule block.
  it("declares font-family on every theme block, from that theme's own fontFamilies['sans-serif']", () => {
    const blocks = themeCSS()
      .split("}")
      .filter((block) => block.includes("{"));
    expect(blocks.length).toBeGreaterThanOrEqual(2); // light + dark

    for (const name of ["light", "dark"]) {
      const selector = name === "light" ? ":root" : `[data-theme="${name}"]`;
      const block = blocks.find((candidate) => candidate.includes(selector));
      expect(block, `no CSS block for theme "${name}"`).toBeDefined();
      expect(block).toContain(
        `font-family: ${getTheme(name).fontFamilies["sans-serif"]}`,
      );
    }
  });
});
