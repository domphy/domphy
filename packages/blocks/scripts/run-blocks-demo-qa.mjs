/**
 * Real browser QA for @domphy/blocks demo:
 * - expects vite demo already on http://127.0.0.1:5610/ OR starts it
 * - Playwright screenshots
 * - axe-core a11y scan
 * - console error capture
 *
 * Usage (from packages/blocks):
 *   pnpm demo   # terminal 1
 *   node scripts/run-blocks-demo-qa.mjs
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const blocksDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const root = join(blocksDir, "..", "..");
const out = join(root, ".ui-qa");
mkdirSync(out, { recursive: true });

// vite.demo.config root is packages/blocks with demo.html (not index.html).
const URL = "http://127.0.0.1:5610/demo.html";

async function waitForUrl(url, ms = 60000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(url);
      // Any HTTP response means the server is up (including 404).
      if (res.status > 0) return res.ok || res.status < 500;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

// Prefer an already-running demo (pnpm demo / vite). Optional auto-start via
// env START_DEMO=1 when pnpm is on PATH.
const alreadyUp = await waitForUrl(URL, 3000);
if (!alreadyUp) {
  if (process.env.START_DEMO === "1") {
    const child = spawn("pnpm", ["demo"], {
      cwd: blocksDir,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
    const ok = await waitForUrl(URL, 90000);
    if (!ok) {
      console.error("Demo server failed to start");
      child.kill();
      process.exit(1);
    }
  } else {
    console.error(
      `Demo not reachable at ${URL}. Start it with: cd packages/blocks && pnpm demo`,
    );
    process.exit(2);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleMsgs = [];
page.on("console", (m) =>
  consoleMsgs.push({ type: m.type(), text: m.text().slice(0, 400) }),
);
page.on("pageerror", (e) =>
  consoleMsgs.push({ type: "pageerror", text: e.message }),
);

await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: join(out, "blocks-demo.png"), fullPage: false });

const stats = await page.evaluate(() => {
  const cards = document.querySelectorAll(".card");
  const errors = document.querySelectorAll(".error");
  return {
    cards: cards.length,
    errors: [...errors].slice(0, 30).map((e) => e.textContent?.slice(0, 240)),
    firstTitles: [...cards]
      .slice(0, 15)
      .map((c) => c.querySelector(":scope > h2")?.textContent),
    bodyHeight: document.body.scrollHeight,
    buttons: document.querySelectorAll("button").length,
  };
});

let axeSummary = null;
try {
  const axePath = require.resolve("axe-core/axe.min.js");
  await page.addScriptTag({ path: axePath });
  axeSummary = await page.evaluate(async () => {
    // eslint-disable-next-line no-undef
    const r = await axe.run(document, { resultTypes: ["violations"] });
    return {
      violationCount: r.violations.length,
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        sample: v.nodes[0]?.target,
      })),
    };
  });
} catch (e) {
  axeSummary = { error: String(e?.message || e) };
}

await page.evaluate(() =>
  window.scrollTo(0, Math.min(3500, document.body.scrollHeight / 3)),
);
await page.waitForTimeout(500);
await page.screenshot({
  path: join(out, "blocks-demo-mid.png"),
  fullPage: false,
});

for (const name of ["login01", "sidebar07", "dashboard01", "marquee"]) {
  const card = page.locator(".card").filter({ hasText: new RegExp(name, "i") });
  if ((await card.count()) > 0) {
    await card.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await card.first().screenshot({ path: join(out, `block-${name}.png`) });
  }
}

await browser.close();

const report = {
  stats,
  consoleMsgs: consoleMsgs.slice(0, 50),
  consoleErrors: consoleMsgs.filter(
    (m) => m.type === "error" || m.type === "pageerror",
  ),
  consoleWarnings: consoleMsgs.filter((m) => m.type === "warning"),
  axeSummary,
  ts: new Date().toISOString(),
};
writeFileSync(
  join(out, "blocks-demo-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

const hardFail =
  (stats.errors?.length ?? 0) > 0 || (report.consoleErrors?.length ?? 0) > 0;
process.exit(hardFail ? 1 : 0);
