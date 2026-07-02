// On-demand QA tool — NOT part of CI, NOT run automatically. Screenshots the
// local @domphy/blocks demo render of a component next to its public
// reference URL, for manual side-by-side comparison. Output is gitignored
// (.visual-compare-output/) and never committed — these are third-party
// pages being screenshotted for QA purposes only, not assets this package
// redistributes.
//
// Usage:
//   pnpm --filter @domphy/blocks visual-compare sidebar07 dashboard01
//   pnpm --filter @domphy/blocks visual-compare --all        (slow — 252 pairs)
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const outputRoot = resolve(packageRoot, ".visual-compare-output");

type RegistryEntry = {
  exportName: string;
  category: string;
  refUrl?: string;
  status: string;
};

async function loadRegistry(): Promise<RegistryEntry[]> {
  const raw = await readFile(resolve(packageRoot, "registry.json"), "utf8");
  return JSON.parse(raw) as RegistryEntry[];
}

async function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const requested = args.filter((arg) => !arg.startsWith("--"));

  const registry = await loadRegistry();
  const targets = all
    ? registry
    : registry.filter((entry) => requested.includes(entry.exportName));

  if (targets.length === 0) {
    console.error("No matching exports. Pass one or more export names, or --all.");
    console.error("Example: pnpm --filter @domphy/blocks visual-compare sidebar07 dashboard01");
    process.exitCode = 1;
    return;
  }

  console.log(`Comparing ${targets.length} component(s)...`);

  const server = await createServer({
    root: packageRoot,
    configFile: resolve(packageRoot, "vite.demo.config.ts"),
    server: { port: 5610 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === "object" && address ? address.port : 5610;
  const demoUrl = `http://localhost:${port}/demo.html`;

  const browser = await chromium.launch();

  try {
    for (const entry of targets) {
      const targetDir = resolve(outputRoot, entry.exportName);
      await mkdir(targetDir, { recursive: true });

      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      try {
        await page.goto(demoUrl, { waitUntil: "networkidle" });
        const locator = page.locator(`[data-block="${entry.exportName}"]`);
        const count = await locator.count();
        if (count === 0) {
          console.warn(`  skip ${entry.exportName}: not found in demo (check src/index.ts export)`);
          continue;
        }
        // Cards lazy-mount on scroll (to avoid exhausting the browser's WebGL
        // context budget across all 252 demo blocks); force-mount this one
        // directly instead of relying on scroll-driven IntersectionObserver.
        await page.evaluate((name) => (window as unknown as { mountBlock: (n: string) => void }).mountBlock(name), entry.exportName);
        await page.waitForTimeout(150); // let canvas/WebGL/rAF-driven blocks draw their first frame
        await locator.screenshot({ path: resolve(targetDir, "local.png") });
      } catch (error) {
        console.warn(`  local screenshot failed for ${entry.exportName}:`, (error as Error).message);
      } finally {
        await page.close();
      }

      if (!entry.refUrl) {
        console.warn(`  ${entry.exportName}: no reference URL recorded, skipping reference screenshot`);
        continue;
      }

      const refPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      try {
        // "networkidle" never fires on sites with persistent background
        // activity (analytics beacons, live-reload sockets, etc.) — "load"
        // plus a short settle delay is far more reliable for third-party
        // reference pages we don't control.
        await refPage.goto(entry.refUrl, { waitUntil: "load", timeout: 30000 });
        await refPage.waitForTimeout(500);
        await refPage.screenshot({ path: resolve(targetDir, "reference.png"), fullPage: false });
      } catch (error) {
        console.warn(`  reference screenshot failed for ${entry.exportName} (${entry.refUrl}):`, (error as Error).message);
      } finally {
        await refPage.close();
      }

      console.log(`  ${entry.exportName} -> ${targetDir}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(`Done. Output in ${outputRoot} (gitignored, not committed).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
