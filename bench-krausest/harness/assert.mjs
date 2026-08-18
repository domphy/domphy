// Assert isolation defaults, try/finally close, and serve() listen errors.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const runSrc = await readFile(path.join(dir, "run.mjs"), "utf8");
const serveSrc = await readFile(path.join(dir, "serve.mjs"), "utf8");
const report = await readFile(path.join(dir, "..", "REPORT.md"), "utf8");

assert.match(
  runSrc,
  /IMPLS = \(process\.env\.IMPLS \?\? "vanilla,fine,tuned,coarse"\)/,
  "default IMPLS must match REPORT (vanilla,fine,tuned,coarse)",
);
assert.match(runSrc, /RUNS = Number\(process\.env\.RUNS \?\? 3\)/);
assert.match(runSrc, /for \(const op of OPS\)/);
assert.match(runSrc, /async function runOp\(/);
assert.match(
  runSrc,
  /try \{[\s\S]*finally \{[\s\S]*await browser\.close\(\)/,
  "runOp must close the browser in finally",
);
assert.match(
  serveSrc,
  /server\.once\("error"/,
  "serve() must reject listen errors",
);

assert.match(
  report,
  /empty guard|Empty-rule guard is in `StyleList\.patchCSS`/i,
);
assert.doesNotMatch(
  report,
  /`patchCSS` is missing the same guard/,
  "REPORT must not still claim the empty-rule hole",
);
assert.match(report, /fresh Chromium \+ page|isolated/);

const port = 14191;
const first = await serve(port);
try {
  await assert.rejects(() => serve(port), /EADDRINUSE/);
} finally {
  await first.close();
}

console.log("krausest harness assert ok");
