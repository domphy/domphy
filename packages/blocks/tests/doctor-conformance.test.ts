// Doctor-conformance gate: every exported block factory() tree must produce
// zero error-severity diagnostics. Warnings/info may exist only via justified
// `_doctorDisable` (doctor still reports 0 errors after suppression).
//
// This is the regression form of the one-shot `scripts/doctor-probe.ts` used
// during UI polish gates — keep it green whenever a block is added or edited.

import { describe, expect, it } from "vitest";
import { diagnose } from "../../doctor/src/index.ts";
import * as blocks from "../src/index.ts";

const factories = Object.entries(blocks).filter(
  ([, value]) => typeof value === "function",
);

describe("doctor conformance — all block factories", () => {
  it(`probes ${factories.length} factories with zero error-severity diagnostics`, () => {
    expect(factories.length).toBeGreaterThan(100);

    const failures: string[] = [];
    for (const [name, factory] of factories) {
      let tree: unknown;
      try {
        tree = (factory as () => unknown)();
      } catch (error) {
        failures.push(
          `${name}: construct threw — ${error instanceof Error ? error.message : error}`,
        );
        continue;
      }
      const errors = diagnose(tree as any).filter(
        (d) => d.severity === "error",
      );
      if (errors.length > 0) {
        failures.push(
          `${name}: ${errors.map((d) => `${d.rule}: ${d.message}`).join("; ")}`,
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
