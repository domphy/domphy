/**
 * Contrast of every self-contained foreground/background pair pressCSS emits.
 *
 * Truth source: WCAG 2.1 SC 1.4.3 — normal text needs 4.5:1. The tokens are
 * read OUT of the generated stylesheet and resolved through @domphy/theme, so
 * this fails when a pairing actually becomes illegible rather than when a
 * token name changes. Rules that only declare `color` inherit their surface
 * from an ancestor and cannot be judged statically (the browser axe pass in
 * the audit covers those); rules whose background is a `color-mix()` tint have
 * no resolvable hex either. Both are skipped here, by construction.
 */

import { resolveThemeColor } from "@domphy/theme";
import { describe, expect, it } from "vitest";
import { pressCSS } from "../src/theme.js";

// WCAG 2.1 relative-luminance contrast math (same formula as
// packages/theme/tests/contrast.test.ts, kept dependency-free).
function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

interface TokenPair {
  selector: string;
  foreground: { color: string; tone: string };
  background: { color: string; tone: string };
}

const TOKEN = String.raw`var\(--([a-z]+)-(\d+)\)`;

/** Rules that declare BOTH a plain token colour and a plain token surface. */
function selfContainedPairs(css: string): TokenPair[] {
  const pairs: TokenPair[] = [];
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    const [, selector, body] = rule;
    const foreground = body.match(new RegExp(`(?:^|;)color:${TOKEN}`));
    const background = body.match(
      new RegExp(`(?:^|;)background(?:-color)?:${TOKEN}`),
    );
    if (!foreground || !background) continue;
    pairs.push({
      selector: selector.trim().split("\n").join(" ").slice(0, 80),
      foreground: { color: foreground[1], tone: `shift-${foreground[2]}` },
      background: { color: background[1], tone: `shift-${background[2]}` },
    });
  }
  return pairs;
}

describe("pressCSS foreground/background pairs", () => {
  const pairs = selfContainedPairs(pressCSS());

  it("finds the self-contained pairs to judge", () => {
    expect(pairs.length).toBeGreaterThan(3);
  });

  for (const theme of ["light", "dark"]) {
    it(`${theme}: every pair clears WCAG AA 4.5:1`, () => {
      const failing = pairs
        .map((pair) => ({
          selector: pair.selector,
          ratio: contrastRatio(
            resolveThemeColor({ theme, ...pair.foreground }),
            resolveThemeColor({ theme, ...pair.background }),
          ),
        }))
        .filter(({ ratio }) => ratio < 4.5)
        .map(({ selector, ratio }) => `${selector} = ${ratio.toFixed(2)}:1`);
      expect(failing).toEqual([]);
    });
  }
});

/**
 * Shiki 4 font-weight/font-style var consumption.
 *
 * Shiki 1 emitted light-mode bold tokens inline (`font-weight:bold`) and only
 * the dark mode as a var. Shiki 4 emits BOTH modes as vars on the span
 * (`--shiki-light-font-weight:bold;--shiki-dark-font-weight:bold`, italic via
 * the `-font-style` pair) with no inline declaration — so without rules that
 * consume the vars, light-mode bold tokens (diff @@ hunk headers, bold regex
 * tokens) silently render non-bold. This pins that pressCSS() consumes all
 * four vars.
 */
describe("shiki font-weight/font-style vars (shiki 4)", () => {
  it("consumes the --shiki-light/dark font-weight and font-style vars", () => {
    const css = pressCSS();
    // Light mode: plain rule on shiki spans.
    expect(css).toContain("font-weight:var(--shiki-light-font-weight,inherit)");
    expect(css).toContain("font-style:var(--shiki-light-font-style,inherit)");
    // Dark mode: override alongside the existing --shiki-dark color rule.
    expect(css).toContain("font-weight:var(--shiki-dark-font-weight,inherit)");
    expect(css).toContain("font-style:var(--shiki-dark-font-style,inherit)");
    // The dark overrides must live on the dark-theme span selector.
    const darkSpanRule = css.match(
      /html\[data-theme="dark"\] \.shiki span\{[^}]*\}/,
    );
    expect(darkSpanRule, "dark shiki span rule not found").not.toBeNull();
    expect(darkSpanRule![0]).toContain(
      "font-weight:var(--shiki-dark-font-weight,inherit)",
    );
    expect(darkSpanRule![0]).toContain(
      "font-style:var(--shiki-dark-font-style,inherit)",
    );
  });
});
