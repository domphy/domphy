// Theme-awareness gate for the shadcn chart recipes.
//
// 1. Source scan: no `themeColorToken(null, …)` (a concrete light-theme value
//    frozen at module/factory call time) may appear in the chart recipes —
//    paint contexts (SVG attributes, raw-HTML tooltip inline styles, cssText)
//    must use themeColor(null, …) var(--…) references, which resolve against
//    the live theme at paint time. Exactly two sites are whitelisted because
//    the @domphy/chart engine paths they feed cannot resolve CSS var refs
//    (justification documented in a comment at each site).
// 2. Var-ref contract: the shared series-color helpers return var(--…) refs
//    for paint/series-level use, and a concrete hex only for the per-item
//    itemStyle.color path (BarRenderer parses that via hexToRgba only).

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { chartAreaSeriesColor } from "../../../src/shadcn/charts/chart-area-shared.ts";
import { chartBarSeriesColor } from "../../../src/shadcn/charts/chart-bar-shared.ts";
import {
  chartLineSeriesColor,
  tooltipRow,
} from "../../../src/shadcn/charts/chart-line-shared.ts";
import { chartTooltipSeriesColor } from "../../../src/shadcn/charts/chart-tooltip-shared.ts";

const CHARTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../src/shadcn/charts",
);

// Whitelisted `themeColorToken(null` sites, keyed by file with an anchor
// substring of the offending line:
// - chart-area-shared.ts chartColorRgba(): gradient color stops are consumed
//   by the WebGL gradientEndpoints()/colorStopToRgba() path, which has no
//   var-ref resolution — and the baked-in alpha needs concrete channels.
// - chart-bar-shared.ts chartBarSeriesColor().hex: per-data-item
//   itemStyle.color is parsed by BarRenderer via hexToRgba only.
const JUSTIFIED_LIGHT_LOCKS: Record<string, string[]> = {
  "chart-area-shared.ts": ["hexToRgbTriple(themeColorToken(null"],
  "chart-bar-shared.ts": ["hex: themeColorToken(null"],
};

describe("shadcn chart recipes — theme awareness", () => {
  it("has no themeColorToken(null,…) light-locks outside the two engine-mandated sites", () => {
    const offenders: string[] = [];
    const files = readdirSync(CHARTS_DIR).filter((file) =>
      file.endsWith(".ts"),
    );
    for (const file of files) {
      const lines = readFileSync(join(CHARTS_DIR, file), "utf8").split("\n");
      lines.forEach((line, index) => {
        if (!line.includes("themeColorToken(null")) return;
        const justified = (JUSTIFIED_LIGHT_LOCKS[file] ?? []).some((anchor) =>
          line.includes(anchor),
        );
        if (!justified) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      });
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("series-color helpers return var(--…) paint references", () => {
    const cssRefs = [
      chartAreaSeriesColor(0).css,
      chartLineSeriesColor(0).css,
      chartBarSeriesColor(0).css,
      chartTooltipSeriesColor(0),
    ];
    for (const css of cssRefs) {
      expect(css).toMatch(/^var\(--/);
    }
  });

  it("keeps a concrete light-theme hex only for the per-item itemStyle.color path", () => {
    expect(chartBarSeriesColor(0).hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("raw-HTML tooltip rows interpolate var(--…) colors, not baked hexes", () => {
    const row = tooltipRow("<i></i>", "Desktop", "142");
    expect(row).toContain("color:var(--");
    expect(row).not.toMatch(/color:#[0-9a-f]{6}/i);
  });
});
