import { defineConfig } from "vitest/config";

// 173 jsdom test files each import full block trees; with vitest's default
// unbounded forks pool, worker spawn intermittently times out
// (Timeout waiting for worker) on 8-core machines and CI. Cap concurrency
// so the suite stays reliable — same pattern as packages/chart.
export default defineConfig({
  test: {
    pool: "forks",
    maxWorkers: 4,
    // Every test renders a whole block tree into jsdom, and jsdom's CSSOM is
    // the cost. Measured here (8-core box, 4 forks, other work running):
    // signup03 inserts 83 rules per render at 385-564ms, of which 157-336ms
    // is `CSSStyleSheet.insertRule` (~2ms/rule); sidebarLeftRight inserts 611
    // rules per render at 1148-2505ms. A single `it()` that renders one of
    // the big sidebars therefore spends 1-2.5s before its first assertion,
    // and vitest's default 5000ms left too little headroom — both
    // `signup03 > renders the legal links` and `sidebarLeftRight > renders a
    // working demo tree` have timed out on it with no async code in sight.
    // Re-measured 2026-09-24 (same conditions — several concurrent agents
    // building/testing this same tree): sidebarLeftRight still 2017ms in
    // tests/lifecycle-harness.test.ts's single-render sweep, consistent with
    // the original range, so the budget stands. 20s = ~8-10x the measured
    // worst single render — a budget widening, not the CSS-dedupe cure (see
    // packages/core's own `core-css-wall-time-residual` debt for that).
    testTimeout: 20_000,
    // Playwright specs live in e2e/*.spec.ts — keep them out of `pnpm test`
    // / `pnpm -r test` so Chromium never starts next to the jsdom suite.
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
  },
});
