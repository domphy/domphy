import { describe, expect, it } from "vitest";
import { diagnose, fix, format } from "../src/index";

const rules = (tree: unknown, opts?: Parameters<typeof diagnose>[1]) =>
  diagnose(tree, opts).map((d) => d.rule);

// The 12 rules the doctor is contracted to implement. A crafted input below
// produces each one; the test asserts the SET of producible rule ids equals
// this list, so a renamed or dropped rule (or a sneaked-in new one) fails CI.
const EXPECTED_RULES = [
  "missing-key",
  "unstable-key",
  "duplicate-key",
  "unknown-tag",
  "void-content",
  "inline-typography",
  "raw-theme-value",
  "raw-spacing-value",
  "unknown-tone",
  "middle-surface-anchor",
  "unknown-density",
  "unknown-size",
] as const;

describe("rule coverage (all 12 rules fire and no extras exist)", () => {
  // One input per rule. Each is the minimal tree that triggers exactly that
  // rule (plus possibly itself only). The set produced by all of them combined
  // must equal EXPECTED_RULES.
  const samplesByRule: Record<string, unknown> = {
    "missing-key": { ul: () => [{ li: "a" }, { li: "b" }] },
    "unstable-key": {
      ul: () => [
        { li: "a", _key: 0 },
        { li: "b", _key: 1 },
      ],
    },
    "duplicate-key": {
      div: [
        { li: "a", _key: "x" },
        { li: "b", _key: "x" },
      ],
    },
    "unknown-tag": { dvi: "typo" },
    "void-content": { input: "oops" },
    "inline-typography": { p: "x", style: { fontSize: "20px" } },
    "raw-theme-value": { div: "x", style: { color: "#ff0000" } },
    "raw-spacing-value": { div: "x", style: { padding: "16px" } },
    "unknown-tone": { div: "x", dataTone: "surface" },
    "middle-surface-anchor": { div: "x", dataTone: "shift-9" },
    "unknown-density": { div: "x", dataDensity: "compact" },
    "unknown-size": { div: "x", dataSize: "large" },
  };

  it("each of the 12 rule ids is produced by its crafted input", () => {
    for (const rule of EXPECTED_RULES) {
      expect(rules(samplesByRule[rule])).toContain(rule);
    }
  });

  it("the union of all produced rule ids equals exactly the 12 expected rules", () => {
    const produced = new Set<string>();
    for (const sample of Object.values(samplesByRule)) {
      for (const rule of rules(sample)) produced.add(rule);
    }
    expect([...produced].sort()).toEqual([...EXPECTED_RULES].sort());
  });
});

describe("isValidTone characterization (current behavior, do not change)", () => {
  // CURRENT behavior: a bare integer is accepted as a tone regardless of range,
  // because isValidTone short-circuits on /^-?\d+$/ before any range check.
  it("accepts an out-of-range bare integer like dataTone: '999'", () => {
    expect(rules({ div: "x", dataTone: "999" })).not.toContain("unknown-tone");
  });

  it("accepts a negative bare integer like dataTone: '-5'", () => {
    expect(rules({ div: "x", dataTone: "-5" })).not.toContain("unknown-tone");
  });

  it("still rejects non-numeric, non-grammar words like 'surface'", () => {
    expect(rules({ div: "x", dataTone: "surface" })).toContain("unknown-tone");
  });
});

describe("raw-theme-value shorthand hint quality", () => {
  it("extracts the embedded #hex from a shorthand so the LCH hint works", () => {
    const issue = diagnose({
      div: "x",
      style: { border: "1px solid #ccc" },
    }).find((d) => d.rule === "raw-theme-value");
    expect(issue).toBeDefined();
    // The perceptual hint must be present (not the generic fallback), proving
    // the color token was extracted from the shorthand before LCH conversion.
    expect(issue?.hint).toContain("themeColor(");
    expect(issue?.hint).toContain("LCH");
    expect(issue?.hint).not.toContain("themeColor(l, tone, colorName)");
  });

  it("extracts an embedded rgba() from a box-shadow-style shorthand", () => {
    const issue = diagnose({
      div: "x",
      style: { background: "linear 0 rgba(0, 112, 243, 1)" },
    }).find((d) => d.rule === "raw-theme-value");
    expect(issue).toBeDefined();
    expect(issue?.hint).toContain("LCH");
    // a saturated blue should map to the primary family
    expect(issue?.hint).toContain("primary");
  });
});

describe("fix() is a no-op for non-void-content issues", () => {
  it("returns the tree unchanged with empty applied when only warnings/info remain", () => {
    const input = {
      div: [
        { p: "x", style: { fontSize: "20px" } }, // inline-typography (warning)
        { span: "y", style: { color: "#ff0000" } }, // raw-theme-value (info)
        { div: "z", dataTone: "surface" }, // unknown-tone (warning)
      ],
    };
    const result = fix(input);
    expect(result.applied).toEqual([]);
    // tree is structurally equal to the input (deep-equal copy, no mutation)
    expect(result.tree).toEqual(input);
    // the unfixed issues are still reported for the model/human
    const remaining = result.report.issues.map((i) => i.rule);
    expect(remaining).toContain("inline-typography");
    expect(remaining).toContain("raw-theme-value");
    expect(remaining).toContain("unknown-tone");
    // none of these are void-content (nothing was auto-fixed)
    expect(remaining).not.toContain("void-content");
  });
});

describe("format() icon variants", () => {
  it("renders the error icon (✗) for an error-severity diagnostic", () => {
    const out = format(diagnose({ input: "oops" })); // void-content = error
    expect(out).toContain("✗");
    expect(out).toContain("[void-content]");
  });

  it("renders the info icon (i) for an info-severity diagnostic", () => {
    const out = format(diagnose({ div: "x", style: { color: "#ff0000" } }));
    expect(out).toContain("i ["); // info icon is a bare "i" before the [rule]
    expect(out).toContain("[raw-theme-value]");
  });

  it("renders the warning icon (⚠) for a warning-severity diagnostic", () => {
    const out = format(diagnose({ p: "x", style: { fontSize: "20px" } }));
    expect(out).toContain("⚠");
    expect(out).toContain("[inline-typography]");
  });
});
