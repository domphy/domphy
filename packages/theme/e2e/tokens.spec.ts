import { expect, test } from "@playwright/test";
import {
  AMBIENTS,
  COLORS,
  FILLS,
  SURFACES,
  THEMES,
  TONES,
} from "../demo-matrix.js";
import { themeTokens } from "../src/theme.js";
import { resolveThemeColor } from "../src/tone.js";

// Real-Chromium evidence for themeCSS()'s :root fallback, the data-theme
// flip, and the resolveToneStep()/textToneOn()/textToneOnRampEdge() contract
// — none of which jsdom (packages/theme/tests/*.test.ts) can prove, because
// jsdom never resolves a CSS custom property to a concrete color: those
// specs check the var(--…) STRING themeColor() produces, never what a real
// browser paints from it.

function parseRgb(computed: string): { r: number; g: number; b: number } {
  const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(computed);
  if (!match) throw new Error(`unparseable computed color: ${computed}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function hexToRgbString(hex: string): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  if (!match) throw new Error(`unparseable token hex: ${hex}`);
  const [r, g, b] = match.slice(1, 4).map((part) => parseInt(part, 16));
  return `rgb(${r}, ${g}, ${b})`;
}

// WCAG 2.x relative luminance / contrast ratio (the formula "4.5:1" in
// AGENTS.md's contrast contract refers to) — computed from the REAL
// getComputedStyle() colors the browser painted, not from source theme
// tokens, so this closes the same "jsdom can't resolve CSS vars" gap the
// rest of this spec does.
function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string): number {
  const luminanceA = relativeLuminance(parseRgb(a));
  const luminanceB = relativeLuminance(parseRgb(b));
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe(":root fallback and data-theme flip", () => {
  test("an attribute-less page renders real light-theme colors, not empty vars", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const probe = page.locator("#theme-probe");
    const background = await probe.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const color = await probe.evaluate((el) => getComputedStyle(el).color);

    // The probe's inline style is the literal `var(--neutral-0)`/
    // `var(--neutral-9)` reference themeCSS() emits — not resolveThemeColor()
    // (which additionally applies the dark theme's darkBias, tested by the
    // "resolveToneStep vs real Chromium" matrix below), so the truth source
    // here is the raw ramp step themeTokens() carries for the theme's own
    // "light" block.
    expect(background).toBe(hexToRgbString(themeTokens("light").neutral[0]));
    expect(color).toBe(hexToRgbString(themeTokens("light").neutral[9]));
  });

  test("data-theme=dark on the document flips the probe's computed tokens", async ({
    page,
  }) => {
    await page.goto("/demo.html");
    const probe = page.locator("#theme-probe");
    const lightBackground = await probe.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "dark"),
    );
    const darkBackground = await probe.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const darkColor = await probe.evaluate((el) => getComputedStyle(el).color);

    expect(darkBackground).not.toBe(lightBackground);
    expect(darkBackground).toBe(hexToRgbString(themeTokens("dark").neutral[0]));
    expect(darkColor).toBe(hexToRgbString(themeTokens("dark").neutral[9]));

    // data-theme="light" resolves back to the same :root fallback colors.
    await page.evaluate(() =>
      document.documentElement.setAttribute("data-theme", "light"),
    );
    const backToLight = await probe.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(backToLight).toBe(lightBackground);
  });
});

test.describe("resolveToneStep vs real Chromium", () => {
  test("every theme x surface x tone x color cell paints the ramp step resolveToneStep predicts", async ({
    page,
  }) => {
    await page.goto("/demo.html");

    const painted: Record<string, string> = await page.evaluate(() => {
      const result: Record<string, string> = {};
      document.querySelectorAll<HTMLElement>("[data-cell]").forEach((el) => {
        const key = el.dataset.cell!;
        if (key.split("|").length === 4) {
          result[key] = getComputedStyle(el).backgroundColor;
        }
      });
      return result;
    });

    let checked = 0;
    for (const theme of THEMES) {
      for (const surface of SURFACES) {
        for (const tone of TONES) {
          for (const color of COLORS) {
            const key = `${theme}|${surface}|${tone}|${color}`;
            const expected = hexToRgbString(
              resolveThemeColor({ theme, surface, tone, color }),
            );
            expect(painted[key], key).toBe(expected);
            checked++;
          }
        }
      }
    }
    // 2 themes x 6 surfaces x 14 tones x 3 colors — the same 504-combination
    // matrix packages/theme/tests/theme-api.test.ts verifies off-DOM.
    expect(checked).toBe(504);
  });
});

test.describe("textToneOn / textToneOnRampEdge contrast", () => {
  test("every fill+label pair clears WCAG 4.5:1 on real computed colors", async ({
    page,
  }) => {
    await page.goto("/demo.html");

    const painted: Record<string, { background: string; color: string }> =
      await page.evaluate(() => {
        const result: Record<string, { background: string; color: string }> =
          {};
        document.querySelectorAll<HTMLElement>("[data-cell]").forEach((el) => {
          const key = el.dataset.cell!;
          if (key.split("|").length === 5) {
            const style = getComputedStyle(el);
            result[key] = {
              background: style.backgroundColor,
              color: style.color,
            };
          }
        });
        return result;
      });

    let checked = 0;
    for (const theme of THEMES) {
      for (const ambient of AMBIENTS) {
        for (const fill of FILLS) {
          for (const color of COLORS) {
            for (const fn of ["textToneOn", "textToneOnRampEdge"] as const) {
              const key = `${theme}|${ambient}|${fill}|${color}|${fn}`;
              const cell = painted[key];
              expect(cell, key).toBeDefined();
              const ratio = contrastRatio(cell.background, cell.color);
              expect(ratio, `${key} contrast ${ratio}`).toBeGreaterThanOrEqual(
                4.5,
              );
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBe(
      THEMES.length * AMBIENTS.length * FILLS.length * COLORS.length * 2,
    );
  });
});
