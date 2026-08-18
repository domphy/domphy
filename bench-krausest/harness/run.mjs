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
// Isolation: each (impl, op, run) gets a fresh browser + page. Setup clicks
// (warmup, seed rows) are unmeasured on that page; only the named op is timed.
// Defaults match REPORT.md first table: IMPLS=vanilla,fine,tuned,coarse RUNS=3.
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
const IMPLS = (process.env.IMPLS ?? "vanilla,fine,tuned,coarse").split(",");

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

async function gotoImpl(page, baseUrl, impl) {
  const target =
    impl === "vanilla"
      ? `${baseUrl}/vanilla.html`
      : `${baseUrl}/index.html?impl=${impl}`;
  await page.goto(target, { waitUntil: "load" });
  await page.waitForSelector("#run");
}

async function warmup(page) {
  await timeClick(page, "#run");
  await timeClick(page, "#clear");
}

// One isolated op: own page. `setup` seeds state; `measure` times + asserts.
const OPS = [
  {
    name: "create 1k",
    setup: async () => {},
    measure: async (page) => {
      const ms = await timeClick(page, "#run");
      if ((await rowCount(page)) !== 1000)
        throw new Error("create 1k: wrong row count");
      return ms;
    },
  },
  {
    name: "replace 1k",
    setup: async (page) => {
      await timeClick(page, "#run");
    },
    measure: async (page) => {
      const ms = await timeClick(page, "#run");
      if ((await rowCount(page)) !== 1000)
        throw new Error("replace 1k: wrong row count");
      return ms;
    },
  },
  {
    name: "partial update",
    setup: async (page) => {
      await timeClick(page, "#run");
    },
    measure: async (page) => {
      const ms = await timeClick(page, "#update");
      if (!(await cellText(page, 1, 2)).endsWith(" !!!"))
        throw new Error("partial update: row 1 label not updated");
      return ms;
    },
  },
  {
    name: "select row",
    setup: async (page) => {
      await timeClick(page, "#run");
    },
    measure: async (page) => {
      const ms = await timeClick(
        page,
        "#tbody tr:nth-child(2) td:nth-child(2) a",
      );
      const danger = await page.evaluate(
        () =>
          document.querySelector("#tbody tr.danger td:nth-child(1)")
            ?.textContent,
      );
      if (!danger) throw new Error("select: no tr.danger");
      return ms;
    },
  },
  {
    name: "swap rows",
    setup: async (page) => {
      await timeClick(page, "#run");
    },
    measure: async (page) => {
      const idRow2 = await cellText(page, 2, 1);
      const idRow999 = await cellText(page, 999, 1);
      const ms = await timeClick(page, "#swaprows");
      if (
        (await cellText(page, 2, 1)) !== idRow999 ||
        (await cellText(page, 999, 1)) !== idRow2
      )
        throw new Error("swap: rows 2/999 not swapped");
      return ms;
    },
  },
  {
    name: "remove row",
    setup: async (page) => {
      await timeClick(page, "#run");
    },
    measure: async (page) => {
      const before = await rowCount(page);
      const ms = await timeClick(
        page,
        "#tbody tr:nth-child(4) td:nth-child(3) a",
      );
      if ((await rowCount(page)) !== before - 1)
        throw new Error("remove: row count not -1");
      return ms;
    },
  },
  {
    name: "append 1k",
    setup: async (page) => {
      await timeClick(page, "#run");
    },
    measure: async (page) => {
      const ms = await timeClick(page, "#add");
      if ((await rowCount(page)) !== 2000)
        throw new Error("append: wrong row count");
      return ms;
    },
  },
  {
    name: "create 10k",
    setup: async () => {},
    measure: async (page) => {
      const ms = await timeClick(page, "#runlots");
      if ((await rowCount(page)) !== 10000)
        throw new Error("create 10k: wrong row count");
      return ms;
    },
  },
  {
    name: "clear 10k",
    setup: async (page) => {
      await timeClick(page, "#runlots");
    },
    measure: async (page) => {
      const ms = await timeClick(page, "#clear");
      if ((await rowCount(page)) !== 0)
        throw new Error("clear 10k: rows remain");
      return ms;
    },
  },
];

async function runOp(baseUrl, impl, op) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await gotoImpl(page, baseUrl, impl);
    await warmup(page);
    await op.setup(page);
    return await op.measure(page);
  } finally {
    await browser.close();
  }
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const { url, close } = await serve(4190);

try {
  const results = {};
  for (const impl of IMPLS) {
    results[impl] = {};
    for (const op of OPS) {
      const samples = [];
      for (let i = 0; i < RUNS; i++) {
        samples.push(await runOp(url, impl, op));
      }
      results[impl][op.name] = {
        median: median(samples),
        runs: samples,
      };
    }
  }

  const ops = OPS.map((op) => op.name);
  const header = ["op", ...IMPLS].join("\t");
  console.log("\n=== median of " + RUNS + " isolated runs (ms) ===");
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
  await close();
}
