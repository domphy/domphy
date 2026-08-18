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

  it("activates a theme in main.ts (no unstyled first render)", () => {
    // Regression: the starter called only themeApply(), which injects the
    // theme stylesheets but activates no [data-theme] scope — every
    // var(--…) token resolved to nothing and the demo rendered unstyled
    // (bare black text, invisible buttons) on first `npm run dev`.
    const mainTs = files.find((file) => file.path === "src/main.ts");
    expect(mainTs).toBeDefined();
    expect(mainTs?.contents).toContain("applySystemTheme()");
  });

  it("uses layout patches instead of hand-rolled flex styles in main.ts", () => {
    // Regression: the starter hand-rolled `display: flex` + `gap`/`flexDirection`
    // inline styles, which AGENTS.md forbids ("Layout, not hand-rolled flex
    // styles: reach for stack()/row()"). The first file a new user reads must
    // model the idiomatic pattern.
    const mainTs = files.find((file) => file.path === "src/main.ts");
    expect(mainTs).toBeDefined();
    expect(mainTs?.contents).toContain("$: [row()]");
    expect(mainTs?.contents).toContain("$: [stack({ gap: 4 })]");
    expect(mainTs?.contents).not.toContain('display: "flex"');
  });

  it("has no literal px/rem/em spacing values in main.ts (doctor raw-spacing-value)", () => {
    // Regression: the starter carried `gap: "8px"`, `marginTop: "12px"`,
    // `margin: "48px auto"`, `padding: "0 16px"` — five raw-spacing-value
    // diagnostics on a brand-new project running the prescribed
    // `domphy-doctor` self-check. themeSpacing() returns calc(…) strings,
    // which the rule treats as computed and never flags.
    const mainTs = files.find((file) => file.path === "src/main.ts");
    expect(mainTs).toBeDefined();
    const literalSpacing =
      /\b(?:margin|marginTop|marginBottom|marginBlock|marginInline|padding|paddingInline|paddingBlock|gap|rowGap|columnGap):\s*"[^"]*-?\d+(?:\.\d+)?(?:px|rem|em)\b/;
    expect(mainTs?.contents).not.toMatch(literalSpacing);
  });

  it("ships an AGENTS.md whose tone grammar matches the current spec", () => {
    // Regression: the scaffolded guide documented only inherit/base/shift-N,
    // omitting the increase-N/decrease-N families and the border-strong alias
    // the root AGENTS.md has specified since the tone model landed.
    const agentsMd = files.find((file) => file.path === "AGENTS.md");
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.contents).toContain("increase-N");
    expect(agentsMd?.contents).toContain("decrease-N");
    expect(agentsMd?.contents).toContain("border-strong");
  });

  it("ships an AGENTS.md that steers to layout patches and away from removed APIs", () => {
    // An AI working in the scaffolded project must not revive the removed
    // form()/field() patches (old docs mention them) and must prefer
    // stack()/row() over inline flex styles.
    const agentsMd = files.find((file) => file.path === "AGENTS.md");
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.contents).toContain("stack()");
    expect(agentsMd?.contents).toContain("row()");
    expect(agentsMd?.contents).toContain("@domphy/form");
  });

  it("ships an AGENTS.md that states a string child is TEXT and requires a doctor self-check", () => {
    // Condensed guide used to omit two rules every agent needs on first
    // write: strings are never parsed as HTML, and diagnose() must pass.
    const agentsMd = files.find((file) => file.path === "AGENTS.md");
    expect(agentsMd).toBeDefined();
    expect(agentsMd?.contents).toContain("A string child is TEXT, always");
    expect(agentsMd?.contents).toContain("rawHtml");
    expect(agentsMd?.contents).toContain("@domphy/doctor");
    expect(agentsMd?.contents).toContain("diagnose");
  });
});

describe("package README", () => {
  it("documents applySystemTheme alongside themeApply", () => {
    // themeApply() only injects stylesheets; without applySystemTheme() the
    // starter is unstyled. The package README used to mention only themeApply.
    const readme = readFileSync(resolve(__dirname, "../README.md"), "utf8");
    expect(readme).toContain("themeApply");
    expect(readme).toContain("applySystemTheme");
  });
});
