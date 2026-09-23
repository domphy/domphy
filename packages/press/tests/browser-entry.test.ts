import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { describe, expect, it } from "vitest";

// Truth source: esbuild's own `platform: "browser"` rule — it refuses to
// resolve `node:*` builtins and errors out. That is the exact failure the docs
// playground hits when it bundles the press markdown pipeline for the browser,
// so bundling the real entry with the real bundler is the check, not a scan of
// our own source text.
const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

describe("@domphy/press/browser", () => {
  it("bundles for the browser platform with no Node built-ins (esbuild)", async () => {
    const result = await esbuild.build({
      entryPoints: [join(src, "browser.ts")],
      bundle: true,
      platform: "browser",
      format: "esm",
      target: "es2020",
      write: false,
      logLevel: "silent",
    });
    expect(result.errors).toEqual([]);
  }, 60000);

  // MEASURED: 2278ms on an idle machine (vite's on-demand transform of the
  // whole remark/unified graph on first import). Under concurrent load this
  // package's tests were observed timing out at the 5000ms default (5098ms
  // measured) — same 60000ms budget as the sibling esbuild test above,
  // which does comparable transform work.
  it("ships the markdown pipeline the docs playground imports", async () => {
    const browserEntry = await import("../src/browser.js");
    for (const name of [
      "parseMarkdown",
      "markdownToDomphy",
      "createMarkdown",
      "walkMdast",
      "splitFrontmatter",
      "transformOutsideCodeBlocks",
      "createUniqueSlugger",
      "defaultSlugify",
    ]) {
      expect(typeof (browserEntry as Record<string, unknown>)[name]).toBe(
        "function",
      );
    }
  }, 60000);
});
