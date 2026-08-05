// CPU profiler: uses the CDP Profiler domain against the unminified profile
// build (dist/main.profile.js, bundled from packages/core/src with keepNames)
// so hot functions inside @domphy/core are attributable by name.
//
// Usage: node harness/profile.mjs [op] [impl]
//   op   - create10k (default) | create1k | replace1k | partial | swap | select | remove | clear10k
//   impl - fine (default) | coarse

import { readFile } from "node:fs/promises";
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

const OP = process.argv[2] ?? "create10k";
const IMPL = process.argv[3] ?? "fine";
const REPEATS = Number(process.env.REPEATS ?? 5);

const { url, close } = await serve(4191);
const browser = await chromium.launch();

try {
  const page = await browser.newPage();
  // Swap in the unminified profile build.
  const profileJs = await readFile(path.join(dir, "dist", "main.profile.js"));
  await page.route("**/dist/main.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: profileJs }),
  );
  await page.goto(`${url}/index.html?impl=${IMPL}`, { waitUntil: "load" });
  await page.waitForSelector("#run");

  // Warmup.
  await page.click("#run");
  await page.evaluate(() => window.__flushSync());
  await page.click("#clear");
  await page.evaluate(() => window.__flushSync());

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  await cdp.send("Profiler.start");

  for (let i = 0; i < REPEATS; i++) {
    await page.evaluate(async (op) => {
      const click = (sel) => document.querySelector(sel)?.click();
      const settle = () => {
        window.__flushSync();
        void document.body.offsetHeight;
      };
      switch (op) {
        case "create10k":
          click("#runlots");
          settle();
          click("#clear");
          settle();
          break;
        case "create1k":
          click("#run");
          settle();
          click("#clear");
          settle();
          break;
        case "replace1k":
          click("#run");
          settle();
          click("#run");
          settle();
          click("#clear");
          settle();
          break;
        case "partial":
          click("#run");
          settle();
          click("#update");
          settle();
          click("#clear");
          settle();
          break;
        case "swap":
          click("#run");
          settle();
          click("#swaprows");
          settle();
          click("#clear");
          settle();
          break;
        case "select":
          click("#run");
          settle();
          click("#tbody tr:nth-child(2) td:nth-child(2) a");
          settle();
          click("#tbody tr:nth-child(500) td:nth-child(2) a");
          settle();
          click("#clear");
          settle();
          break;
        case "remove":
          click("#run");
          settle();
          click("#tbody tr:nth-child(4) td:nth-child(3) a");
          settle();
          click("#clear");
          settle();
          break;
        case "clear10k":
          click("#runlots");
          settle();
          click("#clear");
          settle();
          break;
      }
    }, OP);
  }

  const { profile } = await cdp.send("Profiler.stop");

  // Aggregate self time per function (name + url + line).
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const selfTime = new Map();
  const total = profile.timeDeltas.reduce((a, b) => a + b, 0);
  for (let i = 0; i < profile.samples.length; i++) {
    const node = byId.get(profile.samples[i]);
    if (!node) continue;
    const cf = node.callFrame;
    const key = `${cf.functionName || "(anon)"} @ ${path.basename(cf.url)}:${cf.lineNumber + 1}`;
    selfTime.set(key, (selfTime.get(key) ?? 0) + profile.timeDeltas[i]);
  }
  const rows = [...selfTime.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);

  console.log(
    `\n=== CDP profile: op=${OP} impl=${IMPL} repeats=${REPEATS} ===`,
  );
  console.log(`total sampled: ${(total / 1000).toFixed(1)} ms\n`);
  for (const [key, us] of rows) {
    console.log(
      `${(us / 1000).toFixed(1).padStart(8)} ms  ${((us / total) * 100).toFixed(1).padStart(5)}%  ${key}`,
    );
  }
} finally {
  await browser.close();
  close();
}
