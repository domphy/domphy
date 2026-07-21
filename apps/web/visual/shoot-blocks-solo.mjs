/**
 * Shoot every blocks demo on its OWN page (?only=Name) so WebGL charts/globe
 * do not exhaust the browser context limit (full catalog mounts 70+ charts).
 *
 *   node visual/serve-standalone.mjs --port 4177
 *   node visual/shoot-blocks-solo.mjs [outDir]
 */
import { readdirSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const monorepoRoot = join(here, "../../..");
const corePath = join(
  monorepoRoot,
  "node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/index.mjs",
);
if (!existsSync(corePath)) {
  console.error("playwright-core missing at", corePath);
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(corePath).href);

const BASE = process.env.VISUAL_BASE_URL || "http://127.0.0.1:4177";
const theme = process.env.THEME || "light";
const outDir = process.argv[2] || "visual/shots-blocks-solo";
const demosDir = join(here, "../docs/demos/blocks");
const names = readdirSync(demosDir)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.replace(/\.ts$/, ""))
  .sort();

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
    "--enable-unsafe-swiftshader",
  ],
});
// Tall viewport so full login/signup shells + bento mosaics fit without
// scrolling off the capture root.
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
const report = {
  theme,
  mode: "solo",
  base: BASE,
  cells: [],
  issues: [],
};

console.log(`Shooting ${names.length} blocks solo → ${outDir}`);

for (let i = 0; i < names.length; i++) {
  const name = names[i];
  const id = `block-${name}`;
  const url = `${BASE}/?catalog=blocks&only=${encodeURIComponent(name)}&theme=${theme}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector("[data-visual-ready]", { timeout: 60000 });
    await page.addStyleTag({
      content: `*,*::before,*::after{animation:none!important;transition:none!important;clip-path:none!important;-webkit-clip-path:none!important}`,
    });
    const settle =
      /^chart/i.test(name) || /globe|particles|three/i.test(name) ? 1200 : 400;
    await page.waitForTimeout(settle);
    const cell = page.locator(`[data-visual="${id}"]`);
    if ((await cell.count()) === 0) {
      report.issues.push({ id, kind: "missing-cell" });
      console.log(`[MISSING] ${id}`);
      continue;
    }
    await cell.scrollIntoViewIfNeeded();
    const file = join(outDir, `${id}.png`);
    await cell.screenshot({ path: file, animations: "disabled" });
    const text = await cell.innerText().catch(() => "");
    const box = await cell.boundingBox();
    let kind = null;
    if (!box || box.height < 8) kind = "empty-cell";
    // Wrong content: sidebar chrome on non-sidebar demos
    if (
      !/^sidebar/i.test(name) &&
      /Playground|Design Engineering|Sales & Marketing/.test(text)
    ) {
      kind = "sidebar-bleed";
    }
    // Broken image glyph often renders as empty canvas with title only for charts
    const hasBrokenImg = await cell
      .locator('img[src=""], img:not([src])')
      .count()
      .catch(() => 0);
    if (kind) {
      report.issues.push({ id, kind, sample: text.slice(0, 80) });
      console.log(`[${kind}] ${id}`);
    }
    report.cells.push({ id, file, box, hasBrokenImg });
  } catch (e) {
    report.issues.push({ id, kind: "error", message: String(e).slice(0, 200) });
    console.log(`[ERROR] ${id}`, e);
  }
  if ((i + 1) % 20 === 0) console.log(`… ${i + 1}/${names.length}`);
}

writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(`\nDone: ${report.cells.length} shots, ${report.issues.length} issues → ${outDir}`);
await browser.close();
process.exit(report.issues.some((i) => i.kind === "sidebar-bleed") ? 2 : 0);
