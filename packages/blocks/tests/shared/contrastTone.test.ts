import { resolveThemeColor } from "@domphy/theme";
import { describe, expect, it } from "vitest";
import { CHART_BAR_SERIES_TONES } from "../../src/shadcn/charts/chart-bar-shared.ts";
import { PIE_CHART_PALETTE } from "../../src/shadcn/charts/pie-chart-shared.ts";
import { textToneOnFill } from "../../src/shared/contrastTone.ts";

/**
 * Truth source: WCAG 2.1 SC 1.4.3, whose relative-luminance and
 * contrast-ratio formulas are written out below from the spec (not taken
 * from @domphy/theme, so this does not check the palette engine against
 * itself), applied to the real hexes `resolveThemeColor()` returns for the
 * ramp tones the shadcn chart blocks actually fill their shapes with.
 *
 * These labels are printed ON the fill (pie wedge, radial arc, bar), with the
 * axis hidden, so they are the datum's only on-screen representation — normal
 * body text, 4.5:1, not the 3:1 large-text exception.
 */
const WCAG_AA_NORMAL_TEXT = 4.5;

/** WCAG 2.1 "relative luminance". */
function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) =>
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG 2.1 "contrast ratio". */
function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const FILL_TONES = [
  ...new Set<string>([...PIE_CHART_PALETTE, ...CHART_BAR_SERIES_TONES]),
];

describe("textToneOnFill", () => {
  for (const theme of ["light", "dark"]) {
    for (const fillTone of FILL_TONES) {
      it(`clears WCAG 2.1 AA 4.5:1 on a ${theme}-theme primary ${fillTone} fill`, () => {
        const fill = resolveThemeColor({
          theme,
          tone: fillTone as never,
          color: "primary",
        });
        const text = resolveThemeColor({
          theme,
          tone: textToneOnFill(fillTone) as never,
          color: "neutral",
        });
        expect(contrastRatio(text, fill)).toBeGreaterThanOrEqual(
          WCAG_AA_NORMAL_TEXT,
        );
      });
    }
  }
});
