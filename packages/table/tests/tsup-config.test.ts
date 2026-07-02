import { describe, expect, it } from "vitest";
import tsupConfig from "../tsup.config";

// Regression: the iife bundle (dist/table.global.js) is loaded via a plain <script>
// tag with no Node `process` global. Without an esbuild `define` for
// `process.env.NODE_ENV`, the unguarded dev-mode checks in src (e.g. getMemoOptions)
// throw `ReferenceError: process is not defined` on the very first createTable() call.
describe("tsup.config.ts", () => {
  it("statically replaces process.env.NODE_ENV in the iife build", () => {
    const configs = Array.isArray(tsupConfig) ? tsupConfig : [tsupConfig];
    const iifeConfig = configs.find((config) => {
      const entry = config.entry;
      return (
        !Array.isArray(entry) &&
        typeof entry === "object" &&
        entry !== null &&
        "table" in entry
      );
    });

    expect(iifeConfig).toBeDefined();
    expect(iifeConfig?.format).toContain("iife");
    expect(iifeConfig?.define).toEqual({
      "process.env.NODE_ENV": '"production"',
    });
  });
});
