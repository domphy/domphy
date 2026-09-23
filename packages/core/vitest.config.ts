import { defineConfig } from "vitest/config";

// The package had no vitest config, so every test ran on vitest's undeclared
// 5000ms default. Idle measurement (this machine, no other load): 454 tests
// across 53 files in 27.71s cumulative test time, worst single test 552ms
// (tests/public-entry.test.ts, a dynamic import of the built entry). That
// already left little headroom, and this repo regularly runs many agents'
// test suites concurrently — reconciliation.property.test.ts's two fast-check
// suites measured 1.9s-3.7s under exactly that concurrent load (they declare
// their own 30s describe-level override for that reason and are unaffected by
// this default). 15s is ~27x the idle worst case for everything else, leaving
// headroom for load without hiding a genuinely hung test.
export default defineConfig({
  test: {
    testTimeout: 15_000,
  },
});
