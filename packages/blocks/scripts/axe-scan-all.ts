// Runs axe-core (the industry-standard, independent automated accessibility
// checker — not a Domphy-authored tool) against every registered block's
// default zero-arg render, scoped to its own `.block-box` mount point (not
// the demo harness's own `<h2>` title wrapper). Reports every violation
// axe-core finds, grouped by rule id, plus "incomplete" results (checks axe
// itself flags as needing manual review — e.g. contrast behind an image or
// gradient it can't compute automatically).
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { boot, mountedPage, teardown } from "./interaction-harness.js";

type RegistryEntry = { exportName: string };

async function main(): Promise<void> {
  const registryPath = resolve(import.meta.dirname, "..", "registry.json");
  const registry: RegistryEntry[] = JSON.parse(readFileSync(registryPath, "utf8"));
  const names = registry.map((entry) => entry.exportName).sort();

  const { demoUrl } = await boot();

  type Report = {
    name: string;
    violations: Array<{ id: string; impact: string | null; description: string; help: string; nodeCount: number; targets: string[][] }>;
    incomplete: Array<{ id: string; impact: string | null; description: string; nodeCount: number; targets: string[][] }>;
    error?: string;
  };
  const reports: Report[] = [];

  for (const name of names) {
    let page: Awaited<ReturnType<typeof mountedPage>> | undefined;
    try {
      page = await mountedPage(demoUrl, name);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page }).include(`[data-block="${name}"] .block-box`).analyze();
      reports.push({
        name,
        violations: results.violations.map((v) => ({
          id: v.id,
          impact: v.impact ?? null,
          description: v.description,
          help: v.help,
          nodeCount: v.nodes.length,
          targets: v.nodes.map((n) => n.target as string[]),
        })),
        incomplete: results.incomplete.map((v) => ({
          id: v.id,
          impact: v.impact ?? null,
          description: v.description,
          nodeCount: v.nodes.length,
          targets: v.nodes.map((n) => n.target as string[]),
        })),
      });
      const status = results.violations.length > 0 ? `${results.violations.length} violation(s)` : "clean";
      console.log(`${name}: ${status}${results.incomplete.length ? `, ${results.incomplete.length} incomplete` : ""}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reports.push({ name, violations: [], incomplete: [], error: message });
      console.log(`${name}: ERROR — ${message.slice(0, 200)}`);
    } finally {
      // Must run on both paths — an unclosed page leaks its own renderer
      // process for the rest of this 252-iteration loop; left unchecked this
      // compounds fast (observed 70+ orphaned chrome-headless-shell.exe
      // processes mid-run before this fix).
      await page?.close().catch(() => {});
    }
  }

  await teardown();

  const outputPath = resolve(import.meta.dirname, "..", ".axe-scan-report.json");
  writeFileSync(outputPath, JSON.stringify(reports, null, 2));

  const withViolations = reports.filter((r) => r.violations.length > 0);
  const withErrors = reports.filter((r) => r.error);
  const byRule = new Map<string, number>();
  for (const report of withViolations) {
    for (const violation of report.violations) {
      byRule.set(violation.id, (byRule.get(violation.id) ?? 0) + 1);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`${reports.length} blocks scanned, ${withViolations.length} with violations, ${withErrors.length} errored.`);
  console.log(`Violations by rule:`);
  for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count} block(s)`);
  }
  console.log(`\nFull report: ${outputPath}`);
}

main();
