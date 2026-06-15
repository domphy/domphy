import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cacheKey, renderMermaidCached } from "../src/cache.js";

describe("cacheKey", () => {
  it("is stable for identical source and options", () => {
    const a = cacheKey("graph TD; A-->B;", { theme: "dark" });
    const b = cacheKey("graph TD; A-->B;", { theme: "dark" });
    expect(a).toBe(b);
  });

  it("normalizes whitespace so trivially different source matches", () => {
    const a = cacheKey("graph TD; A-->B;");
    const b = cacheKey("\n  graph TD; A-->B;  \n");
    expect(a).toBe(b);
  });

  it("changes when an output-affecting option changes", () => {
    const light = cacheKey("graph TD; A-->B;", { theme: "default" });
    const dark = cacheKey("graph TD; A-->B;", { theme: "dark" });
    expect(light).not.toBe(dark);
  });

  it("ignores options that do not affect output", () => {
    const a = cacheKey("graph TD; A-->B;", { cacheDir: "/tmp/one" });
    const b = cacheKey("graph TD; A-->B;", { cacheDir: "/tmp/two" });
    expect(a).toBe(b);
  });
});

describe("renderMermaidCached", () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "domphy-mermaid-"));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("renders once then serves the second call from disk", async () => {
    const renderer = vi.fn(async (code: string) => `<svg>${code}</svg>`);

    const first = await renderMermaidCached(
      "graph TD; A-->B;",
      { cacheDir },
      renderer,
    );
    const second = await renderMermaidCached(
      "graph TD; A-->B;",
      { cacheDir },
      renderer,
    );

    expect(first).toBe(second);
    expect(first).toContain("<svg>");
    expect(renderer).toHaveBeenCalledTimes(1);
  });

  it("renders again when the source changes", async () => {
    const renderer = vi.fn(async (code: string) => `<svg>${code}</svg>`);

    await renderMermaidCached("graph TD; A-->B;", { cacheDir }, renderer);
    await renderMermaidCached("graph TD; C-->D;", { cacheDir }, renderer);

    expect(renderer).toHaveBeenCalledTimes(2);
  });

  it("bypasses the cache when cache is disabled", async () => {
    const renderer = vi.fn(async () => "<svg/>");

    await renderMermaidCached("graph TD; A-->B;", { cacheDir, cache: false }, renderer);
    await renderMermaidCached("graph TD; A-->B;", { cacheDir, cache: false }, renderer);

    expect(renderer).toHaveBeenCalledTimes(2);
  });
});
