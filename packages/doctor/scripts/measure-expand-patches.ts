// Isolates expandPatches()'s own cost (packages/doctor/src/shared.ts) from
// module-import time. The 192-file/90-file scans this package's real-world
// benchmarks were measured against import a whole tree of modules per file
// (tsx compiling + evaluating every dependency) — that cost dwarfs anything
// expandPatches itself could plausibly add, so those numbers say nothing
// about THIS function. This calls it directly, in a tight loop, on
// representative shapes: no import, no diagnose() rule-walking alongside it.
//
// Run with: node --import tsx packages/doctor/scripts/measure-expand-patches.ts
import { expandPatches } from "../src/shared.js";

// Shaped like a real composed patch: button() returns ~10 style props, some
// reactive, plus a nested $ (buttonGhost() composing further) in the
// "variant: ghost" branch — this mirrors that depth (one level of $-nesting)
// without needing the real @domphy/ui package as a dependency here.
function composedElement(): Record<string, unknown> {
  return {
    div: "x",
    $: [
      {
        type: "button",
        style: {
          appearance: "none",
          fontSize: () => "1rem",
          paddingBlock: () => "0.5em",
          paddingInline: () => "1em",
          borderRadius: () => "0.5em",
          display: "flex",
          gap: () => "0.25em",
          cursor: "pointer",
          outline: () => "1px solid var(--primary-9)",
          color: () => "var(--primary-13)",
        },
        $: [
          {
            style: {
              backgroundColor: () => "var(--primary-1)",
              borderColor: () => "var(--primary-4)",
            },
          },
        ],
      },
    ],
  };
}

const WARMUP = 10_000;
const ITERATIONS = 200_000;

for (let i = 0; i < WARMUP; i++) expandPatches(composedElement());

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) expandPatches(composedElement());
const elapsedMs = performance.now() - start;
const perCallUs = (elapsedMs / ITERATIONS) * 1000;

console.log(
  `${ITERATIONS} expandPatches() calls on a 2-level composed element: ` +
    `${elapsedMs.toFixed(1)} ms total, ${perCallUs.toFixed(2)} µs/call`,
);

// Smoke bound, not a tuned budget: measured ~41-44 µs/call across repeated
// runs on a typical dev machine (the `delete native.$` / `delete
// native[contentKey]` calls put `native` into V8 dictionary mode, which is
// the likely reason this isn't sub-microsecond — a real optimization
// opportunity, but out of scope here, which is only to have this MEASURED at
// all). 100 µs/call is ~2.3x that measured baseline: enough headroom for
// machine-to-machine noise, tight enough to catch an actual regression (e.g.
// the recursion no longer sharing structure, or a merge going quadratic).
const PER_CALL_SMOKE_BOUND_US = 100;
if (perCallUs > PER_CALL_SMOKE_BOUND_US) {
  console.error(
    `FAIL: ${perCallUs.toFixed(2)} µs/call exceeds the ${PER_CALL_SMOKE_BOUND_US} µs/call smoke bound.`,
  );
  process.exit(1);
}
console.log(
  `PASS: stayed under the ${PER_CALL_SMOKE_BOUND_US} µs/call smoke bound.`,
);
