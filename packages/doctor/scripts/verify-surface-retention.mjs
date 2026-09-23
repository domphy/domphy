// Measures whether diagnose()'s surface-node cache (packages/doctor/src/diagnose.ts,
// the `surfaceNodes` map) leaks a listener per resolved reactive style value.
//
// Before core composed `onSubscribe` instead of replacing it
// (packages/core/src/classes/ElementAttribute.ts `addListener`), a probe's
// release handle never arrived, so every `themeColor()` resolution against a
// cached surface node left one more permanent subscription on that node's
// `dataTone` attribute — measured 51 MB retained over 40k resolutions against
// one node, with forced GC. `diagnose()` used to work around it by clearing
// the whole cache after every call. Now that core releases correctly, the
// cache is kept across calls (bounded: `dataTone` is a small closed set), and
// this script is the GC-measured proof that doing so does not leak.
//
// Run with: node --expose-gc packages/doctor/scripts/verify-surface-retention.mjs
// (requires `pnpm --filter @domphy/doctor build` first — it measures the
// built dist, the same artifact that ships).

import { themeColor } from "@domphy/theme";
import { diagnose } from "../dist/index.js";

if (typeof globalThis.gc !== "function") {
  console.error("Run with `node --expose-gc` — global.gc() is not available.");
  process.exit(2);
}

const SURFACES = ["shift-0", "shift-2", "shift-5"];
const ITERATIONS = 50_000;

function tree(surface) {
  return {
    div: "x",
    dataTone: surface,
    style: { color: (l) => themeColor(l, "text", "primary") },
  };
}

function heapUsedMB() {
  globalThis.gc();
  globalThis.gc(); // a single pass can leave a to-be-swept generation behind
  return process.memoryUsage().heapUsed / (1024 * 1024);
}

// Warm up: first touch of each surface allocates the ElementNode + attribute
// machinery this run intends to hold steady, not measure as "growth".
for (const surface of SURFACES) diagnose(tree(surface));

const before = heapUsedMB();
for (let i = 0; i < ITERATIONS; i++) {
  diagnose(tree(SURFACES[i % SURFACES.length]));
}
const after = heapUsedMB();
const growth = after - before;

console.log(
  `${ITERATIONS} resolutions against ${SURFACES.length} cached surfaces: ` +
    `${before.toFixed(2)} MB -> ${after.toFixed(2)} MB (Δ ${growth.toFixed(2)} MB)`,
);

// Threshold, not zero: V8 heap noise (dictionary rehashes, JIT bookkeeping)
// is a few hundred KB even with no leak at all. The bug this guards against
// was 51 MB over 40k resolutions (~1.3 KB/resolution) — a real regression
// clears this by two orders of magnitude, so 5 MB stays a tight bound.
const THRESHOLD_MB = 5;
if (growth > THRESHOLD_MB) {
  console.error(
    `FAIL: heap grew ${growth.toFixed(2)} MB, over the ${THRESHOLD_MB} MB threshold — a subscription is leaking again.`,
  );
  process.exit(1);
}
console.log(`PASS: growth stayed under the ${THRESHOLD_MB} MB threshold.`);
