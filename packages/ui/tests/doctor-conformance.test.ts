// Doctor-conformance gate: every exported UI patch applied to its default host
// produces zero error-severity diagnostics AND zero un-justified warnings.
//
// diagnose() expands `$` itself, the same way ElementNode/mergePartial does, so
// the host element goes in exactly as a caller writes it — this gates what
// callers really run.

import { describe, expect, it } from "vitest";
import { diagnose } from "../../doctor/src/index.ts";
import * as ui from "../src/index.ts";
import {
  defaultContent,
  HOST,
  PATCH_ARGS,
  UTILITY_EXPORTS,
} from "./patch-catalog.ts";

describe("doctor conformance — all UI patch defaults", () => {
  const patches = Object.entries(ui).filter(
    ([name, value]) => typeof value === "function" && HOST[name],
  );

  it("covers every function export from @domphy/ui", () => {
    const allFns = Object.entries(ui)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .filter((name) => !UTILITY_EXPORTS.has(name))
      .sort();
    const missing = allFns.filter((name) => !HOST[name]);
    expect(missing, `HOST map missing: ${missing.join(", ")}`).toEqual([]);
    expect(patches.length).toBe(allFns.length);
    expect(patches.length).toBeGreaterThanOrEqual(96);
  });

  it(`probes ${patches.length} patch trees with zero error/warning diagnostics`, () => {
    const failures: string[] = [];
    for (const [name, fn] of patches) {
      const tag = HOST[name];
      let patch: unknown;
      try {
        patch =
          name in PATCH_ARGS
            ? (fn as (a: unknown) => unknown)(PATCH_ARGS[name])
            : (fn as () => unknown)();
      } catch (error) {
        failures.push(
          `${name}: construct threw — ${error instanceof Error ? error.message : error}`,
        );
        continue;
      }

      const el: Record<string, unknown> = {
        [tag]: defaultContent(tag),
        $: [patch],
      };
      if (name === "link" || name === "linkButton") el.href = "#";
      // image()'s contract puts src/alt on the native host element (the patch
      // only styles) — alt:"" is the valid decorative form.
      if (name === "image") {
        el.src = "x.png";
        el.alt = "";
      }
      // Do NOT set type= on void inputs here — patches that need type set it
      // themselves; a bare type: "text" without a found tag used to trigger
      // unknown-tag when expand failed to preserve input:null.

      const diags = diagnose(el as any).filter(
        (d) => d.severity === "error" || d.severity === "warning",
      );
      if (diags.length > 0) {
        failures.push(
          `${name}: ${diags.map((d) => `${d.severity}/${d.rule}: ${d.message}`).join("; ")}`,
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
