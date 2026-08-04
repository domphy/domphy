/**
 * Code-group active-tab contrast guarantee.
 *
 * The checked code-group tab is brand-colored text on the shift-2 (bgMute)
 * tinted tab bar. shift-9 primary on shift-2 measures below WCAG AA on the
 * built-in ramps (and worse on saturated generated ramps — the docs site's
 * amber brand hit 4.08:1), so the default emits shift-10. This pins both the
 * emitted token and the resolved-color math on the built-in themes.
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

describe("code-group active tab contrast", () => {
  it("emits shift-10 primary text on the shift-2 tinted bar", () => {
    const css = pressCSS();
    expect(css).toContain(":checked~.tabs>label");
    // The checked-tab rule (8 comma-joined selectors) must pair the deeper
    // brand step with bgMute.
    const rule = css.match(/[^{]*:checked~\.tabs>label[^{]*\{[^}]*\}/);
    expect(rule, "checked-tab rule not found").not.toBeNull();
    expect(rule![0]).toContain("color:var(--primary-10)");
    expect(rule![0]).toContain("background:var(--neutral-2)");
  });

  for (const theme of ["light", "dark"]) {
    it(`${theme}: shift-10 primary on shift-2 clears WCAG AA 4.5:1`, () => {
      const fg = resolveThemeColor({
        theme,
        tone: "shift-10",
        color: "primary",
      });
      const bg = resolveThemeColor({
        theme,
        tone: "shift-2",
        color: "neutral",
      });
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("documents why shift-9 was not enough (regression boundary)", () => {
    // If a future ramp change makes shift-9 pass, the tab tone can be
    // revisited — until then this failing pair is the reason for shift-10.
    for (const theme of ["light", "dark"]) {
      const fg = resolveThemeColor({
        theme,
        tone: "shift-9",
        color: "primary",
      });
      const bg = resolveThemeColor({
        theme,
        tone: "shift-2",
        color: "neutral",
      });
      expect(contrastRatio(fg, bg)).toBeLessThan(4.5);
    }
  });
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
