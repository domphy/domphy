import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSite } from "../src/build.ts";
import { defineConfig } from "../src/config.ts";
import type { RenderDocOptions, SiteConfig } from "../src/types.ts";

// Simulate a page that fails during markdown rendering: renderDoc throws for
// bad.md, everything else goes through the real pipeline.
vi.mock("../src/pipeline.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/pipeline.ts")>();
  return {
    ...actual,
    renderDoc: (source: string, options: RenderDocOptions) => {
      if (options.filePath.endsWith("bad.md"))
        throw new Error("boom: malformed page");
      return actual.renderDoc(source, options);
    },
  };
});

describe("buildSite failure policy", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  function makeConfig(extra: Partial<SiteConfig> = {}): SiteConfig {
    return {
      ...defineConfig({
        title: "Test Site",
        description: "",
        hostname: "https://example.com",
        srcDir,
        outDir,
      }),
      ...extra,
    };
  }

  function seed(): void {
    srcDir = mkdtempSync(join(tmpdir(), "press-fail-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-fail-out-"));
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    writeFileSync(join(srcDir, "bad.md"), "# Broken\n");
  }

  it("fails the build when any page fails to render", async () => {
    seed();
    await expect(
      buildSite({ config: makeConfig(), srcDir, outDir }),
    ).rejects.toThrow(/1 page\(s\) failed[\s\S]*\/bad \[markdown\]: boom/);
  }, 30_000);

  it("still renders the healthy pages before failing", async () => {
    seed();
    await expect(
      buildSite({ config: makeConfig(), srcDir, outDir }),
    ).rejects.toThrow(/page\(s\) failed/);
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
    expect(existsSync(join(outDir, "bad", "index.html"))).toBe(false);
  }, 30_000);

  it("continueOnError: true builds past page errors", async () => {
    seed();
    await expect(
      buildSite({
        config: makeConfig({ continueOnError: true }),
        srcDir,
        outDir,
      }),
    ).resolves.toBeUndefined();
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
    expect(existsSync(join(outDir, "bad", "index.html"))).toBe(false);
  }, 30_000);
});
