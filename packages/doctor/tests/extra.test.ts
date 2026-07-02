import { describe, expect, it } from "vitest";
import { type CustomRule, diagnose, fix, format } from "../src/index";

const rules = (tree: unknown, opts?: Parameters<typeof diagnose>[1]) =>
  diagnose(tree, opts).map((d) => d.rule);

// The 18 rules the doctor is contracted to implement. A crafted input below
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
  "low-opacity",
  "tone-background-inherit",
  "low-contrast",
  "missing-color",
  "dataTone-surface-contract",
  "color-shift-minimum",
] as const;

describe("rule coverage (all 18 rules fire and no extras exist)", () => {
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
    "low-opacity": { span: "x", style: { opacity: "0.3" } },
    "tone-background-inherit": {
      div: "x",
      style: { backgroundColor: (_l: unknown) => "var(--test-neutral-5)" },
    },
    "low-contrast": {
      div: "x",
      style: {
        backgroundColor: (_l: unknown) => "var(--test-neutral-0)",
        color: (_l: unknown) => "var(--test-neutral-3)",
      },
    },
    "missing-color": {
      div: "x",
      style: { backgroundColor: (_l: unknown) => "var(--test-neutral-0)" },
    },
    "dataTone-surface-contract": {
      div: "x",
      dataTone: "shift-0",
      // no backgroundColor, no color
    },
    "color-shift-minimum": {
      div: "x",
      dataTone: "shift-0",
      style: {
        backgroundColor: (_l: unknown) => "var(--test-neutral-0)",
        color: (_l: unknown) => "var(--test-neutral-4)",
      },
    },
  };

  it("each of the 18 rule ids is produced by its crafted input", () => {
    for (const rule of EXPECTED_RULES) {
      expect(rules(samplesByRule[rule])).toContain(rule);
    }
  });

  it("the union of all produced rule ids equals exactly the 18 expected rules", () => {
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

describe("raw-theme-value: CSS named color detection on direct color props", () => {
  it("flags color: 'red'", () => {
    expect(rules({ div: "x", style: { color: "red" } })).toContain(
      "raw-theme-value",
    );
  });

  it("flags backgroundColor: 'white'", () => {
    expect(
      rules({ div: "x", style: { backgroundColor: "white" } }),
    ).toContain("raw-theme-value");
  });

  it("flags fill: 'black' on svg elements", () => {
    expect(rules({ svg: null, style: { fill: "black" } })).toContain(
      "raw-theme-value",
    );
  });

  it("flags stroke: 'blue'", () => {
    expect(rules({ path: null, style: { stroke: "blue" } })).toContain(
      "raw-theme-value",
    );
  });

  it("does not flag semantic keywords: transparent, currentColor, inherit", () => {
    expect(
      rules({ div: "x", style: { color: "transparent" } }),
    ).not.toContain("raw-theme-value");
    expect(
      rules({ div: "x", style: { color: "currentColor" } }),
    ).not.toContain("raw-theme-value");
    expect(rules({ div: "x", style: { color: "inherit" } })).not.toContain(
      "raw-theme-value",
    );
    expect(
      rules({ div: "x", style: { backgroundColor: "none" } }),
    ).not.toContain("raw-theme-value");
  });

  it("does not flag reactive named colors", () => {
    expect(
      rules({ div: "x", style: { color: () => "red" } }),
    ).not.toContain("raw-theme-value");
  });

  it("does not double-flag: hex is caught by hex check, not named-color check", () => {
    // '#ff0000' is already caught by LITERAL_COLOR; it must appear only once.
    const d = diagnose({ div: "x", style: { color: "#ff0000" } }).filter(
      (i) => i.rule === "raw-theme-value",
    );
    expect(d).toHaveLength(1);
  });

  it("does not flag CSS functions like var() or calc()", () => {
    expect(
      rules({ div: "x", style: { color: "var(--my-color)" } }),
    ).not.toContain("raw-theme-value");
  });

  it("named color hint mentions themeColor and bypass warning", () => {
    const d = diagnose({ div: "x", style: { color: "red" } });
    const issue = d.find((i) => i.rule === "raw-theme-value");
    expect(issue?.hint).toContain("themeColor(");
    expect(issue?.hint).toContain("bypass");
  });
});

describe("rule filtering: only / exclude options", () => {
  const mixed = {
    p: "x",
    style: { fontSize: "20px", color: "#ff0000" },
    dataTone: "surface",
  };

  it("only: emits just the listed rules", () => {
    const d = diagnose(mixed, { only: ["inline-typography"] });
    expect(d.map((i) => i.rule)).toContain("inline-typography");
    expect(d.map((i) => i.rule)).not.toContain("raw-theme-value");
    expect(d.map((i) => i.rule)).not.toContain("unknown-tone");
  });

  it("only: empty list returns no diagnostics", () => {
    expect(diagnose(mixed, { only: [] })).toEqual([]);
  });

  it("exclude: removes the listed rules, keeps the rest", () => {
    const d = diagnose(mixed, { exclude: ["raw-theme-value"] });
    expect(d.map((i) => i.rule)).toContain("inline-typography");
    expect(d.map((i) => i.rule)).toContain("unknown-tone");
    expect(d.map((i) => i.rule)).not.toContain("raw-theme-value");
  });

  it("only takes precedence over exclude", () => {
    // both set: only wins
    const d = diagnose(mixed, {
      only: ["inline-typography"],
      exclude: ["inline-typography"],
    });
    expect(d.map((i) => i.rule)).toContain("inline-typography");
    expect(d.map((i) => i.rule)).not.toContain("raw-theme-value");
  });

  it("only + exclude work with custom rules too", () => {
    const customRule: CustomRule = {
      id: "my-rule",
      severity: "warning",
      check: (_el, _path, tag) =>
        tag === "p" ? [{ message: "p tag found" }] : [],
    };
    // Custom rule fires normally
    const d1 = diagnose(mixed, { rules: [customRule] });
    expect(d1.map((i) => i.rule)).toContain("my-rule");
    // Only built-in rule — custom rule suppressed
    const d2 = diagnose(mixed, {
      rules: [customRule],
      only: ["inline-typography"],
    });
    expect(d2.map((i) => i.rule)).not.toContain("my-rule");
    // Exclude custom rule
    const d3 = diagnose(mixed, {
      rules: [customRule],
      exclude: ["my-rule"],
    });
    expect(d3.map((i) => i.rule)).not.toContain("my-rule");
    expect(d3.map((i) => i.rule)).toContain("inline-typography");
  });
});

describe("_doctorDisable suppress annotation", () => {
  it("_doctorDisable: true suppresses ALL element-level diagnostics", () => {
    // unknown-tone would normally fire
    expect(
      rules({ div: "x", dataTone: "surface", _doctorDisable: true }),
    ).not.toContain("unknown-tone");
    // inline-typography would normally fire
    expect(
      rules({
        p: "x",
        style: { fontSize: "20px" },
        _doctorDisable: true,
      }),
    ).not.toContain("inline-typography");
  });

  it("_doctorDisable: ['rule-id'] suppresses only the listed rule", () => {
    const d = diagnose({
      p: "x",
      style: { fontSize: "20px" },
      dataTone: "surface",
      _doctorDisable: ["unknown-tone"],
    });
    // unknown-tone suppressed
    expect(d.map((i) => i.rule)).not.toContain("unknown-tone");
    // inline-typography still fires
    expect(d.map((i) => i.rule)).toContain("inline-typography");
  });

  it("_doctorDisable: 'rule-id' (string) works like single-element array", () => {
    expect(
      rules({ div: "x", dataTone: "surface", _doctorDisable: "unknown-tone" }),
    ).not.toContain("unknown-tone");
  });

  it("does not suppress diagnostics on child elements", () => {
    // The disable is only on the outer div, not the inner p
    const d = diagnose({
      div: [{ p: "x", style: { fontSize: "20px" } }],
      _doctorDisable: true,
    });
    expect(d.map((i) => i.rule)).toContain("inline-typography");
  });

  it("suppresses missing-key when annotated on the reactive-list container", () => {
    // missing-key fires at the container (ul) path, so _doctorDisable on ul should suppress it
    expect(
      rules({
        ul: () => [{ li: "a" }, { li: "b" }],
        _doctorDisable: ["missing-key"],
      }),
    ).not.toContain("missing-key");
  });

  it("_doctorDisable: false / null / undefined is a no-op", () => {
    // Should still fire normally
    expect(
      rules({ div: "x", dataTone: "surface", _doctorDisable: false }),
    ).toContain("unknown-tone");
    expect(
      rules({ div: "x", dataTone: "surface", _doctorDisable: null }),
    ).toContain("unknown-tone");
    expect(
      rules({ div: "x", dataTone: "surface", _doctorDisable: undefined }),
    ).toContain("unknown-tone");
  });
});

describe("custom rules via options.rules", () => {
  const noEmptyContent: CustomRule = {
    id: "no-empty-content",
    severity: "warning",
    category: "structure",
    check: (element, _path, tag) => {
      if (element[tag] === "") {
        return [
          {
            message: `Empty string content on <${tag}> — use null or provide text.`,
            hint: `Write { ${tag}: null, … } or provide a non-empty string.`,
          },
        ];
      }
      return [];
    },
  };

  const noSpanTag: CustomRule = {
    id: "no-span",
    severity: "error",
    check: (_element, _path, tag) => {
      if (tag === "span") {
        return [{ message: "Avoid bare <span> — use a semantic patch." }];
      }
      return [];
    },
  };

  it("fires the custom rule for matching elements", () => {
    expect(rules({ p: "" }, { rules: [noEmptyContent] })).toContain(
      "no-empty-content",
    );
  });

  it("does not fire for non-matching elements", () => {
    expect(rules({ p: "hello" }, { rules: [noEmptyContent] })).not.toContain(
      "no-empty-content",
    );
  });

  it("carries the custom rule's severity and category", () => {
    const d = diagnose({ p: "" }, { rules: [noEmptyContent] });
    const issue = d.find((i) => i.rule === "no-empty-content");
    expect(issue?.severity).toBe("warning");
    expect(issue?.category).toBe("structure");
  });

  it("custom rule can override severity per violation", () => {
    const conditional: CustomRule = {
      id: "conditional",
      severity: "warning",
      check: (_element, _path, tag) => {
        if (tag === "span") {
          return [{ message: "span found", severity: "error" }];
        }
        return [];
      },
    };
    const d = diagnose({ span: "x" }, { rules: [conditional] });
    const issue = d.find((i) => i.rule === "conditional");
    expect(issue?.severity).toBe("error"); // overridden
  });

  it("runs multiple custom rules in order", () => {
    const d = diagnose({ span: "" }, { rules: [noEmptyContent, noSpanTag] });
    const ruleIds = d.map((i) => i.rule);
    expect(ruleIds).toContain("no-empty-content");
    expect(ruleIds).toContain("no-span");
  });

  it("custom rules are subject to only/exclude filtering", () => {
    // exclude custom rule
    const d1 = diagnose(
      { p: "" },
      { rules: [noEmptyContent], exclude: ["no-empty-content"] },
    );
    expect(d1.map((i) => i.rule)).not.toContain("no-empty-content");

    // only a built-in rule — custom rule suppressed
    const d2 = diagnose(
      { p: "", style: { fontSize: "20px" } },
      { rules: [noEmptyContent], only: ["inline-typography"] },
    );
    expect(d2.map((i) => i.rule)).toContain("inline-typography");
    expect(d2.map((i) => i.rule)).not.toContain("no-empty-content");
  });

  it("custom rule error does not crash the doctor (skipped silently)", () => {
    const throwing: CustomRule = {
      id: "throws",
      severity: "warning",
      check: () => {
        throw new Error("boom");
      },
    };
    // Should not throw; built-in rules still run
    expect(() =>
      diagnose(
        { p: "x", style: { fontSize: "20px" } },
        { rules: [throwing] },
      ),
    ).not.toThrow();
    const d = diagnose(
      { p: "x", style: { fontSize: "20px" } },
      { rules: [throwing] },
    );
    expect(d.map((i) => i.rule)).toContain("inline-typography");
  });
});

describe("Diagnostic.category field", () => {
  it("void-content has category 'structure'", () => {
    const d = diagnose({ input: "oops" });
    expect(d[0].category).toBe("structure");
  });

  it("unknown-tag has category 'structure'", () => {
    const d = diagnose({ dvi: "typo" });
    expect(d[0].category).toBe("structure");
  });

  it("inline-typography has category 'typography'", () => {
    const d = diagnose({ p: "x", style: { fontSize: "20px" } });
    expect(d[0].category).toBe("typography");
  });

  it("raw-theme-value has category 'theme'", () => {
    const d = diagnose({ div: "x", style: { color: "#ff0000" } });
    expect(d[0].category).toBe("theme");
  });

  it("raw-spacing-value has category 'theme'", () => {
    const d = diagnose({ div: "x", style: { padding: "16px" } });
    expect(d[0].category).toBe("theme");
  });

  it("unknown-tone has category 'data-attr'", () => {
    const d = diagnose({ div: "x", dataTone: "surface" });
    expect(d[0].category).toBe("data-attr");
  });

  it("missing-key has category 'key'", () => {
    const d = diagnose({ ul: () => [{ li: "a" }, { li: "b" }] });
    expect(d[0].category).toBe("key");
  });

  it("duplicate-key has category 'key'", () => {
    const d = diagnose({
      div: [
        { li: "a", _key: "x" },
        { li: "b", _key: "x" },
      ],
    });
    expect(d[0].category).toBe("key");
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

describe("low-opacity rule", () => {
  it("warns on static opacity below 0.6", () => {
    const d = diagnose({ span: "x", style: { opacity: "0.3" } });
    const issue = d.find((i) => i.rule === "low-opacity");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    expect(issue?.category).toBe("visual");
  });

  it("downgrades to info when &:hover restores to 1 (hover-reveal pattern)", () => {
    const d = diagnose({
      span: "x",
      style: { opacity: "0.4", "&:hover": { opacity: "1" } },
    });
    const issue = d.find((i) => i.rule === "low-opacity");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("info");
  });

  it("does not fire on opacity 0 (intentionally hidden)", () => {
    expect(
      rules({ span: "x", style: { opacity: "0" } }),
    ).not.toContain("low-opacity");
  });

  it("does not fire on opacity >= 0.6", () => {
    expect(
      rules({ span: "x", style: { opacity: "0.6" } }),
    ).not.toContain("low-opacity");
    expect(
      rules({ span: "x", style: { opacity: "1" } }),
    ).not.toContain("low-opacity");
  });

  it("does not fire on reactive opacity function", () => {
    expect(
      rules({ span: "x", style: { opacity: () => "0.3" } }),
    ).not.toContain("low-opacity");
  });

  it("does not fire on opacity inside pseudo-class (&:hover)", () => {
    // opacity in hover state is the enhanced UX — not a violation
    expect(
      rules({ span: "x", style: { "&:hover": { opacity: "0.3" } } }),
    ).not.toContain("low-opacity");
  });
});

describe("regression: missing-color/dataTone-surface-contract do not build a live ElementNode", () => {
  // Regression for a bug where these two checks constructed a real, recursive
  // ElementNode (via `new ElementNode(element)`) just to inspect a resolved
  // style string — firing lifecycle hooks and recursing into children on a
  // throwaway, detached subtree. Presence of `_onInit`/child hooks firing is
  // observable proof that a live node was built.
  it("missing-color: does not fire the element's own _onInit hook", () => {
    let inited = false;
    const element = {
      div: "x",
      style: { backgroundColor: (_l: unknown) => "var(--test-neutral-5)" },
      _onInit: () => {
        inited = true;
      },
    };
    expect(rules(element)).toContain("missing-color");
    expect(inited).toBe(false);
  });

  it("dataTone-surface-contract: does not fire the element's own _onInit hook", () => {
    let inited = false;
    const element = {
      div: "x",
      dataTone: "shift-0",
      _onInit: () => {
        inited = true;
      },
    };
    expect(rules(element)).toContain("dataTone-surface-contract");
    expect(inited).toBe(false);
  });

  it("missing-color: does not recurse into children and fire their _onInit hook", () => {
    let childInited = false;
    const element = {
      div: [
        {
          span: "child",
          _onInit: () => {
            childInited = true;
          },
        },
      ],
      style: { backgroundColor: (_l: unknown) => "var(--test-neutral-5)" },
    };
    diagnose(element);
    expect(childInited).toBe(false);
  });
});

describe("regression: low-contrast only compares shift steps within the same CSS-var family", () => {
  // Regression for a bug where extractShift() discarded the family segment of
  // `var(--<family>-<N>)`, so two vars from unrelated families (e.g.
  // var(--error-3) vs var(--success-9)) were compared purely on their numeric
  // suffix — contradicting the documented "same family" requirement.
  it("does not fire when color/backgroundColor resolve to different families", () => {
    const element = {
      div: "x",
      style: {
        color: (_l: unknown) => "var(--error-3)",
        backgroundColor: (_l: unknown) => "var(--success-9)",
      },
    };
    expect(rules(element)).not.toContain("low-contrast");
  });

  it("still fires when color/backgroundColor share a family and the shift gap is < 9", () => {
    const element = {
      div: "x",
      style: {
        color: (_l: unknown) => "var(--neutral-3)",
        backgroundColor: (_l: unknown) => "var(--neutral-9)",
      },
    };
    expect(rules(element)).toContain("low-contrast");
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
