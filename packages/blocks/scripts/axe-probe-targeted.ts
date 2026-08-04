// One-off diagnostic probe for the axe re-scan (deferral wave 2): re-runs
// axe on just the blocks that reported violations/errors in the full scan
// and dumps each flagged node's HTML snippet, foreground/background colors
// and contrast data so violations can be classified (essential vs decorative
// text) without re-scanning all 173 blocks.
import { AxeBuilder } from "@axe-core/playwright";
import { boot, mountedPage, teardown } from "./interaction-harness.js";

const TARGETS = ["chartPieLabel", "chartRadarRadius"];

async function main(): Promise<void> {
  const { demoUrl } = await boot();

  for (const name of TARGETS) {
    let page: Awaited<ReturnType<typeof mountedPage>> | undefined;
    try {
      page = await mountedPage(demoUrl, name);
      await page.waitForTimeout(500);
      const results = await new AxeBuilder({ page })
        .include(`[data-block="${name}"] .block-box`)
        .analyze();
      console.log(`\n=== ${name} ===`);
      if (results.violations.length === 0) {
        console.log("clean");
      }
      for (const violation of results.violations) {
        console.log(
          `rule: ${violation.id} (${violation.impact}) — ${violation.help}`,
        );
        for (const node of violation.nodes) {
          console.log(`  target: ${JSON.stringify(node.target)}`);
          console.log(`  html: ${node.html.slice(0, 220)}`);
          console.log(
            `  data: ${JSON.stringify((node as unknown as { data?: unknown }).data ?? null)}`,
          );
          console.log(
            `  message: ${(node.nodes ?? []).map((n) => n.message).join(" | ")}`,
          );
        }
      }
    } catch (error) {
      console.log(
        `\n=== ${name} === ERROR: ${(error as Error).message.slice(0, 200)}`,
      );
    } finally {
      await page?.close().catch(() => {});
    }
  }

  await teardown();
}

main();
