// Runs the real-pixel WCAG contrast measurement (contrast-harness.ts) across
// every block in the "backgrounds" category — the ones whose whole premise
// is decorative/animated content sitting directly behind default text, where
// a declared-color contrast check can be fooled by blend-modes/blur/opacity
// compositing (see noiseTexture, found failing via manual inspection).
// Samples at two points in time per block (shortly after mount, and again
// ~2.5s later) to catch looping/ambient effects that drift brighter or
// darker over their cycle, not just their first frame.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { boot, mountedPage, teardown } from "./interaction-harness.js";
import { measureBlockContrast } from "./contrast-harness.js";

type RegistryEntry = { exportName: string; filePath: string };

function normalizePath(filePath: string): string {
  return filePath.split("\\").join("/");
}

async function main(): Promise<void> {
  const registryPath = resolve(import.meta.dirname, "..", "registry.json");
  const registry: RegistryEntry[] = JSON.parse(readFileSync(registryPath, "utf8"));
  const names = registry
    .filter((entry) => normalizePath(entry.filePath).includes("/backgrounds/"))
    .map((entry) => entry.exportName)
    .sort();

  console.log(`Scanning ${names.length} "backgrounds" blocks for real WCAG contrast...\n`);

  const { demoUrl } = await boot();

  type BlockReport = {
    name: string;
    results: Array<{
      text: string;
      tag: string;
      ratio: number;
      requiredRatio: number;
      passes: boolean;
      textRgb: number[];
      bgRgb: number[];
      fontSizePx: number;
      fontWeight: number;
      sampledAt: string;
    }>;
    error?: string;
  };
  const reports: BlockReport[] = [];

  for (const name of names) {
    let page: Awaited<ReturnType<typeof mountedPage>> | undefined;
    try {
      page = await mountedPage(demoUrl, name);
      const early = await measureBlockContrast(page, name);
      await page.waitForTimeout(2500);
      const later = await measureBlockContrast(page, name);
      const results = [
        ...early.map((r) => ({ ...r, sampledAt: "t+0.3s" })),
        ...later.map((r) => ({ ...r, sampledAt: "t+2.8s" })),
      ];
      reports.push({ name, results });
      const failing = results.filter((r) => !r.passes);
      console.log(
        failing.length > 0
          ? `[FAIL] ${name}: ${failing.length}/${results.length} text run(s) below threshold`
          : `[PASS] ${name}: ${results.length} text run(s), all pass`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reports.push({ name, results: [], error: message });
      console.log(`[ERROR] ${name}: ${message.slice(0, 200)}`);
    } finally {
      await page?.close().catch(() => {});
    }
  }

  await teardown();

  const outputPath = resolve(import.meta.dirname, "..", ".contrast-scan-report.json");
  writeFileSync(outputPath, JSON.stringify(reports, null, 2));

  const failingBlocks = reports.filter((r) => r.results.some((res) => !res.passes));
  console.log(`\n=== Summary ===`);
  console.log(`${reports.length} blocks scanned, ${failingBlocks.length} with a real contrast failure.`);
  for (const report of failingBlocks) {
    for (const result of report.results.filter((r) => !r.passes)) {
      console.log(
        `  ${report.name} [${result.sampledAt}] "${result.text.slice(0, 40)}": ratio=${result.ratio.toFixed(2)} (need ${result.requiredRatio}) text=rgb(${result.textRgb.map((v) => Math.round(v))}) bg=rgb(${result.bgRgb.map((v) => Math.round(v))})`,
      );
    }
  }
  console.log(`\nFull report: ${outputPath}`);
}

main();
