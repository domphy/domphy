// Timing harness: drives the benchmark app in real Chromium (playwright) and
// measures the standard krausest operations.
//
// Methodology: each op is bracketed with performance.now(); after the click
// dispatch (synchronous through Domphy's event handlers) we drain Domphy's
// reactivity queue via window.__flushSync() and force a synchronous layout
// (read offsetHeight) so style+layout cost is included. This approximates
// "update DOM + layout"; the official krausest driver additionally waits for
// paint, so our numbers are a lower bound relative to the published table.
//
// Each op is the median of RUNS page loads (fresh page per run).
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(dir, "..");
const require = createRequire(
  path.join(repoRoot, "apps", "web", "package.json"),
);
const { chromium } = require("@playwright/test");

const RUNS = Number(process.env.RUNS ?? 3);
const IMPLS = (process.env.IMPLS ?? "fine,coarse").split(",");

// Measure one click action. Bracket: t0 -> click -> flushSync -> reflow -> t1.
async function timeClick(page, selector) {
  return page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`selector not found: ${sel}`);
    const t0 = performance.now();
    el.click();
    window.__flushSync();
    void document.body.offsetHeight; // force synchronous layout
    return performance.now() - t0;
  }, selector);
}

const rowCount = (page) =>
  page.evaluate(() => document.querySelectorAll("#tbody tr").length);
const cellText = (page, row, col) =>
  page.evaluate(
    ([r, c]) =>
      document.querySelector(`#tbody tr:nth-child(${r}) td:nth-child(${c})`)
        ?.textContent ?? "",
    [row, col],
  );

async function runOnce(page, baseUrl, impl) {
  const target =
    impl === "vanilla"
      ? `${baseUrl}/vanilla.html`
      : `${baseUrl}/index.html?impl=${impl}`;
  await page.goto(target, { waitUntil: "load" });
  await page.waitForSelector("#run");

  // Warmup (unmeasured): exercise code paths + JIT before measuring.
  await timeClick(page, "#run");
  await timeClick(page, "#clear");

  const m = {};

  m["create 1k"] = await timeClick(page, "#run");
  if ((await rowCount(page)) !== 1000)
    throw new Error("create 1k: wrong row count");

  m["replace 1k"] = await timeClick(page, "#run");
  if ((await rowCount(page)) !== 1000)
    throw new Error("replace 1k: wrong row count");

  m["partial update"] = await timeClick(page, "#update");
  if (!(await cellText(page, 1, 2)).endsWith(" !!!"))
    throw new Error("partial update: row 1 label not updated");

  m["select row"] = await timeClick(
    page,
    "#tbody tr:nth-child(2) td:nth-child(2) a",
  );
  const danger = await page.evaluate(
    () =>
      document.querySelector("#tbody tr.danger td:nth-child(1)")?.textContent,
  );
  if (!danger) throw new Error("select: no tr.danger");

  const idRow2 = await cellText(page, 2, 1);
  const idRow999 = await cellText(page, 999, 1);
  m["swap rows"] = await timeClick(page, "#swaprows");
  if (
    (await cellText(page, 2, 1)) !== idRow999 ||
    (await cellText(page, 999, 1)) !== idRow2
  )
    throw new Error("swap: rows 2/999 not swapped");

  const before = await rowCount(page);
  m["remove row"] = await timeClick(
    page,
    "#tbody tr:nth-child(4) td:nth-child(3) a",
  );
  if ((await rowCount(page)) !== before - 1)
    throw new Error("remove: row count not -1");

  // append 1k: rebuild a clean 1k table (unmeasured), then measure #add.
  await timeClick(page, "#clear");
  await timeClick(page, "#run");
  m["append 1k"] = await timeClick(page, "#add");
  if ((await rowCount(page)) !== 2000)
    throw new Error("append: wrong row count");

  await timeClick(page, "#clear");
  m["create 10k"] = await timeClick(page, "#runlots");
  if ((await rowCount(page)) !== 10000)
    throw new Error("create 10k: wrong row count");

  m["clear 10k"] = await timeClick(page, "#clear");
  if ((await rowCount(page)) !== 0) throw new Error("clear 10k: rows remain");

  return m;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const { url, close } = await serve(4190);

try {
  const results = {};
  for (const impl of IMPLS) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      // Fresh browser per run: a reused browser process shows monotonic
      // slowdown across runs (GC/handle accumulation), skewing medians.
      const browser = await chromium.launch();
      const page = await browser.newPage();
      runs.push(await runOnce(page, url, impl));
      await browser.close();
    }
    results[impl] = {};
    for (const op of Object.keys(runs[0])) {
      results[impl][op] = {
        median: median(runs.map((r) => r[op])),
        runs: runs.map((r) => r[op]),
      };
    }
  }

  const ops = Object.keys(results[IMPLS[0]]);
  const header = ["op", ...IMPLS].join("\t");
  console.log("\n=== median of " + RUNS + " runs (ms) ===");
  console.log(header);
  for (const op of ops) {
    console.log(
      [op, ...IMPLS.map((i) => results[i][op].median.toFixed(1))].join("\t"),
    );
  }
  console.log("\n=== raw runs ===");
  for (const impl of IMPLS) {
    for (const op of ops) {
      console.log(
        `${impl} / ${op}: ${results[impl][op].runs.map((x) => x.toFixed(1)).join(", ")}`,
      );
    }
  }
} finally {
  close();
}
