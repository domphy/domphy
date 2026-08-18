import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isShippablePage,
  pageIslandSpecs,
  parsePressArgs,
  toIslandSourceKey,
} from "../press-build.ts";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "..");
const repoRoot = resolve(webRoot, "../..");

describe("isShippablePage", () => {
  it("excludes visual/ catalogs and *findings.md so they are not public routes", () => {
    expect(isShippablePage(join(webRoot, "docs/visual/index.md"))).toBe(false);
    expect(isShippablePage(join(webRoot, "docs/visual/patches.md"))).toBe(
      false,
    );
    expect(isShippablePage(join(webRoot, "visual/VISUAL-QA-FINDINGS.md"))).toBe(
      false,
    );
    expect(isShippablePage(join(webRoot, "docs/core/index.md"))).toBe(true);
    expect(isShippablePage(join(webRoot, "index.md"))).toBe(true);
  });

  it("is applied to discoverPages in the production build script", () => {
    const source = readFileSync(join(webRoot, "build.press.ts"), "utf8");
    expect(source).toMatch(
      /discoverPages\(appRoot\)\.filter\(\(page\) =>\s*isShippablePage\(page\.filePath\)/,
    );
  });
});

describe("toIslandSourceKey", () => {
  it("emits a repo-relative posix key, never a drive-letter absolute path", () => {
    const abs = resolve(webRoot, "docs/demos/ui/Button.ts");
    const key = toIslandSourceKey(abs);
    expect(key).toBe("apps/web/docs/demos/ui/Button.ts");
    expect(key).not.toMatch(/^[A-Za-z]:/);
    expect(key.startsWith("/")).toBe(false);
    expect(key.includes("\\")).toBe(false);
  });
});

describe("pageIslandSpecs", () => {
  it("writes preview source as the repo-relative key, not the build-machine path", () => {
    const abs = resolve(webRoot, "docs/demos/ui/Button.ts");
    const specs = pageIslandSpecs({
      islands: [{ kind: "preview", id: "preview-0", source: abs }],
    });
    const preview = specs.find((spec) => spec.kind === "preview");
    expect(preview?.source).toBe(toIslandSourceKey(abs));
    expect(preview?.source).not.toBe(abs);
    expect(preview?.source).not.toMatch(/^[A-Za-z]:/);
  });
});

describe("dev script / watch args", () => {
  it("points dev at build.press.ts (same island path as production), not press CLI", () => {
    const pkg = JSON.parse(
      readFileSync(join(webRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.dev).toMatch(/build\.press\.ts/);
    expect(pkg.scripts.dev).toMatch(/--watch/);
    expect(pkg.scripts.dev).not.toMatch(/press\/dist\/cli/);
  });

  it("parsePressArgs reads --watch and --port", () => {
    expect(parsePressArgs(["--watch", "--port", "3000"])).toEqual({
      watch: true,
      port: 3000,
    });
    expect(parsePressArgs([])).toEqual({ watch: false, port: 3000 });
  });
});

describe("repoRoot used by toIslandSourceKey", () => {
  it("is the monorepo root that contains apps/web", () => {
    expect(toIslandSourceKey(webRoot)).toBe("apps/web");
    expect(repoRoot.endsWith("domphy") || repoRoot.includes("domphy")).toBe(
      true,
    );
  });
});
