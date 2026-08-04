import { describe, expect, it } from "vitest";
import { getTheme, resolveThemeColor, TONE_STEPS } from "../src/index.ts";

// WCAG 2.1 relative-luminance contrast math (DESIGN.md §2.1 cites the same
// formula). Kept dependency-free so the DESIGN.md K=9 claim — "every pair of
// steps 9 apart clears WCAG 4.5:1", stated as testable in §4 — is pinned by a
// regression test on every built-in ramp, in both themes.
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

const CONTRAST_SPAN = 9; // K = 9 for the 18-step ramp (DESIGN.md §2.1/§4)

describe("contrast span K=9 (DESIGN.md claim, made testable)", () => {
  for (const theme of ["light", "dark"]) {
    it(`${theme}: every role ramp clears WCAG 4.5:1 at index distance ${CONTRAST_SPAN}`, () => {
      const { colors } = getTheme(theme);
      for (const role in colors) {
        const ramp = colors[role]!;
        expect(ramp).toHaveLength(TONE_STEPS);
        for (let i = 0; i + CONTRAST_SPAN < ramp.length; i++) {
          const ratio = contrastRatio(ramp[i]!, ramp[i + CONTRAST_SPAN]!);
          expect(
            ratio,
            `${theme}.${role}[${i}] vs [${i + CONTRAST_SPAN}] (${ramp[i]} vs ${ramp[i + CONTRAST_SPAN]})`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  }
});

describe("semantic alias contrast contract (muted vs text)", () => {
  for (const theme of ["light", "dark"]) {
    it(`${theme}: "text" (shift-9) clears AA 4.5:1 on an edge surface`, () => {
      const fg = resolveThemeColor({ theme, tone: "text", color: "neutral" });
      // resolveThemeColor starts from context 0, so the edge-anchored pair is
      // (shift-0 surface, shift-9 text) — the K=9 span. (A shift-1 "surface"
      // read here is NOT a valid pairing: on a real dataTone surface the text
      // inherits that context and lands at distance 9 from it.)
      const bg = resolveThemeColor({
        theme,
        tone: "shift-0",
        color: "neutral",
      });
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${theme}: "muted" (shift-8) stays in the documented de-emphasis band`, () => {
      const fg = resolveThemeColor({ theme, tone: "muted", color: "neutral" });
      const bg = resolveThemeColor({
        theme,
        tone: "shift-0",
        color: "neutral",
      });
      const ratio = contrastRatio(fg, bg);
      // Contract (docs/theme/tone.md, AGENTS.md): muted is de-emphasis-only —
      // deliberately below the 4.5:1 normal-text floor, but never below the
      // 3:1 large-text/UI floor. If a ramp change pushes it above 4.5 the
      // muted/text distinction has collapsed; below 3.0 it is unreadable.
      expect(ratio).toBeGreaterThanOrEqual(3.0);
      expect(ratio).toBeLessThan(4.5);
    });
  }
});
