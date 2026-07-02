import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { templateFiles } from "../src/templates.ts";
import {
  CORE_VERSION,
  THEME_VERSION,
  UI_VERSION,
} from "../src/versions.generated.ts";

const REPO_ROOT = resolve(__dirname, "../../..");

function readPackageVersion(name: string): string {
  const path = resolve(REPO_ROOT, "packages", name, "package.json");
  return (JSON.parse(readFileSync(path, "utf8")) as { version: string })
    .version;
}

describe("versions.generated.ts", () => {
  // Regression: the CLI used to derive every scaffolded @domphy/* dependency
  // from its OWN version, which is wrong now that core/theme/ui bump
  // independently. This guards that the generated constants track each
  // sibling package's real version instead of silently going stale.
  it("mirrors the current core/theme/ui package.json versions", () => {
    expect(CORE_VERSION).toBe(readPackageVersion("core"));
    expect(THEME_VERSION).toBe(readPackageVersion("theme"));
    expect(UI_VERSION).toBe(readPackageVersion("ui"));
  });
});

describe("templateFiles", () => {
  const versions = { core: "^1.2.3", theme: "^4.5.6", ui: "^7.8.9" };
  const files = templateFiles("my-app", versions);
  const packageJson = files.find((file) => file.path === "package.json");

  it("pins each @domphy/* dependency to its own version independently", () => {
    expect(packageJson).toBeDefined();
    const parsed = JSON.parse(packageJson?.contents ?? "{}") as {
      dependencies: Record<string, string>;
    };
    expect(parsed.dependencies["@domphy/core"]).toBe("^1.2.3");
    expect(parsed.dependencies["@domphy/theme"]).toBe("^4.5.6");
    expect(parsed.dependencies["@domphy/ui"]).toBe("^7.8.9");
  });

  it('never emits an unparseable semver range like "^latest"', () => {
    // The old fallback path could produce the literal string "^latest" in the
    // scaffolded package.json, which npm rejects as an invalid range. Every
    // version is now sourced from build-time constants, so the caret prefix
    // always wraps a real x.y.z version.
    const parsed = JSON.parse(packageJson?.contents ?? "{}") as {
      dependencies: Record<string, string>;
    };
    for (const range of Object.values(parsed.dependencies)) {
      expect(range).toMatch(/^\^\d+\.\d+\.\d+/);
    }
  });

  it("substitutes the project name in every generated file", () => {
    for (const file of files) {
      expect(file.contents).not.toContain("__PROJECT_NAME__");
    }
  });

  it("does not list margin as a forbidden inline typography style", () => {
    // Regression: the scaffolded AGENTS.md used to say "margin" was forbidden
    // inline typography, which is false (margin is spacing, not typography)
    // and contradicted the repo's own AGENTS.md + doctor rule set.
    const agentsMd = files.find((file) => file.path === "AGENTS.md");
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.contents).not.toContain("color, margin, lineHeight");
    expect(agentsMd?.contents).toContain("fontWeight");
  });
});
