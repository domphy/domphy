import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const llms = readFileSync(resolve(here, "../public/llms.txt"), "utf8");

describe("llms.txt stays aligned with AGENTS.md on geometry + doctor rules", () => {
  it("uses borderRadius * 1.5 in the bounded-control formula", () => {
    expect(llms).toMatch(
      /borderRadius:\s*\(l\)\s*=>\s*themeSpacing\(themeDensity\(l\)\s*\*\s*1\.5\)/,
    );
    expect(llms).not.toMatch(
      /borderRadius:\s*\(l\)\s*=>\s*themeSpacing\(themeDensity\(l\)\s*\*\s*1\)/,
    );
  });

  it("lists the full doctor rule set in the self-check / rules sentence", () => {
    const required = [
      "inline-typography",
      "raw-theme-value",
      "raw-spacing-value",
      "low-opacity",
      "tone-background-inherit",
      "missing-color",
      "low-contrast",
      "dataTone-surface-contract",
      "color-shift-minimum",
      "unknown-tone",
      "middle-surface-anchor",
      "unknown-density",
      "unknown-size",
      "invalid-nesting",
      "click-without-keyboard",
      "missing-required-attribute",
      "void-content",
      "missing-key",
      "duplicate-key",
      "unstable-key",
      "unknown-tag",
      "unused-doctor-disable",
    ];
    const selfCheck = llms.match(
      /Self-check generated code with `@domphy\/doctor`[\s\S]*?(?=\n- Read the per-patch)/,
    );
    expect(selfCheck).not.toBeNull();
    const block = selfCheck![0];
    for (const rule of required) {
      expect(block).toContain(`\`${rule}\``);
    }
  });
});
