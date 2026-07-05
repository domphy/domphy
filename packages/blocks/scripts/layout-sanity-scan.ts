// Runtime "does this render at a sane size" scanner — mounts every
// registered block's default zero-arg render and checks every
// svg/canvas/video/iframe/embed/object element (CSS "replaced elements") for
// the exact bug found in pointerHighlight.ts: `position: absolute` + an
// `inset`/top-right-bottom-left offset with NO explicit width/height falls
// back to the browser's default replaced-element intrinsic size (300x150px)
// instead of stretching to fill the positioned box — rendering as a giant
// misplaced element instead of hugging its intended area. That specific
// (300, 150) pair is for all practical purposes impossible to hit by
// legitimate coincidence, so it's a precise, low-false-positive signal for
// this exact bug class — unlike axe-core/contrast-scan-backgrounds.ts, which
// check accessibility/contrast, not layout correctness.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { boot, mountedPage, teardown } from "./interaction-harness.js";

type RegistryEntry = { exportName: string };

type SuspectElement = {
  tag: string;
  className: string;
  position: string;
  width: number;
  height: number;
  top: string;
  right: string;
  bottom: string;
  left: string;
};

async function main(): Promise<void> {
  const registryPath = resolve(import.meta.dirname, "..", "registry.json");
  const registry: RegistryEntry[] = JSON.parse(readFileSync(registryPath, "utf8"));
  const names = registry.map((entry) => entry.exportName).sort();

  const { demoUrl } = await boot();

  type Report = { name: string; suspects: SuspectElement[]; error?: string };
  const reports: Report[] = [];

  for (const name of names) {
    let page: Awaited<ReturnType<typeof mountedPage>> | undefined;
    try {
      page = await mountedPage(demoUrl, name);
      await page.waitForTimeout(500);
      const suspects = await page.evaluate((blockName) => {
        const root = document.querySelector(`[data-block="${blockName}"] .block-box`);
        if (!root) return [];
        const replaced = Array.from(root.querySelectorAll("svg, canvas, video, iframe, embed, object"));
        const found: SuspectElement[] = [];
        for (const element of replaced) {
          const style = getComputedStyle(element);
          if (style.position === "static") continue;
          const hasOffset = [style.top, style.right, style.bottom, style.left].some((value) => value !== "auto");
          if (!hasOffset) continue;
          const rect = element.getBoundingClientRect();
          if (Math.round(rect.width) === 300 && Math.round(rect.height) === 150) {
            found.push({
              tag: element.tagName.toLowerCase(),
              className: element.className.toString(),
              position: style.position,
              width: rect.width,
              height: rect.height,
              top: style.top,
              right: style.right,
              bottom: style.bottom,
              left: style.left,
            });
          }
        }
        return found;
      }, name);
      reports.push({ name, suspects });
      console.log(suspects.length > 0 ? `${name}: ${suspects.length} suspect element(s)` : `${name}: clean`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      reports.push({ name, suspects: [], error: message });
      console.log(`${name}: ERROR — ${message.slice(0, 200)}`);
    } finally {
      await page?.close().catch(() => {});
    }
  }

  await teardown();

  const outputPath = resolve(import.meta.dirname, "..", ".layout-sanity-report.json");
  writeFileSync(outputPath, JSON.stringify(reports, null, 2));

  const withSuspects = reports.filter((r) => r.suspects.length > 0);
  const withErrors = reports.filter((r) => r.error);
  console.log(`\n=== Summary ===`);
  console.log(`${reports.length} blocks scanned, ${withSuspects.length} with a suspect default-sized replaced element, ${withErrors.length} errored.`);
  for (const report of withSuspects) {
    console.log(`  ${report.name}: ${report.suspects.map((s) => `<${s.tag}> (${s.position}, ${s.width}x${s.height})`).join(", ")}`);
  }
  console.log(`\nFull report: ${outputPath}`);
}

main();
