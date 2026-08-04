import { rawHtml } from "@domphy/core";
import { ElementTones, TONE_STEPS, themeColor, themeSize } from "@domphy/theme";
import { describe, expect, it } from "vitest";
import { type CustomRule, diagnose, fix, format } from "../src/index";

const rules = (tree: unknown, opts?: Parameters<typeof diagnose>[1]) =>
  diagnose(tree, opts).map((d) => d.rule);

// The 22 rules the doctor is contracted to implement. A crafted input below
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
  "invalid-nesting",
  "click-without-keyboard",
  "missing-required-attribute",
  "unused-doctor-disable",
] as const;

describe("rule coverage (all 22 rules fire and no extras exist)", () => {
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
      ul: [
        { li: "a", _key: "x" },
        { li: "b", _key: "x" },
      ],
    },
    "unknown-tag": { dvi: "typo" },
    "void-content": { input: "oops" },
    "inline-typography": { p: "x", style: { fontSize: "20px" } },
    "raw-theme-value": { div: "x", style: { color: "#ff0000" } },
    "raw-spacing-value": { div: "x", style: { padding: "16px" } },
    "unknown-tone": { div: "x", dataTone: "invalid-tone-word" },
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
    "invalid-nesting": { p: [{ div: "x" }] },
    "click-without-keyboard": { div: "x", onClick: () => {} },
    "missing-required-attribute": { img: null, src: "x.png" },
    "unused-doctor-disable": { div: "x", _doctorDisable: "low-contrst" },
  };

  it("each of the 22 rule ids is produced by its crafted input", () => {
    for (const rule of EXPECTED_RULES) {
      expect(rules(samplesByRule[rule])).toContain(rule);
    }
  });

  it("the union of all produced rule ids equals exactly the 22 expected rules", () => {
    const produced = new Set<string>();
    for (const sample of Object.values(samplesByRule)) {
      for (const rule of rules(sample)) produced.add(rule);
    }
    expect([...produced].sort()).toEqual([...EXPECTED_RULES].sort());
  });
});

describe("isValidTone grammar matches the @domphy/theme runtime", () => {
  // The runtime's offsetTone() accepts exactly the strings in ElementTones and
  // throws for everything else — including bare-numeric strings. Doctor must
  // agree (an earlier version accepted /^-?\d+$/, advertising "a number" as
  // valid dataTone while the runtime threw for it).
  it("rejects a bare integer string like dataTone: '999'", () => {
    expect(rules({ div: "x", dataTone: "999" })).toContain("unknown-tone");
  });

  it("rejects a negative bare integer string like dataTone: '-5'", () => {
    expect(rules({ div: "x", dataTone: "-5" })).toContain("unknown-tone");
  });

  it("still rejects non-numeric, non-grammar words like 'invalid-tone-word'", () => {
    expect(rules({ div: "x", dataTone: "invalid-tone-word" })).toContain(
      "unknown-tone",
    );
  });

  it("accepts the semantic tone aliases (surface/hover/border/border-strong/muted/text)", () => {
    for (const alias of [
      "surface",
      "hover",
      "border",
      "border-strong",
      "muted",
      "text",
    ]) {
      expect(rules({ div: "x", dataTone: alias })).not.toContain(
        "unknown-tone",
      );
    }
  });

  it("doctor's grammar is pinned against theme's exported ElementTones", () => {
    // Every string the runtime accepts must pass doctor, and a set of strings
    // the runtime rejects must fail doctor — the two grammars cannot drift
    // apart silently again.
    for (const tone of ElementTones) {
      expect(rules({ div: "x", dataTone: tone })).not.toContain("unknown-tone");
    }
    for (const bad of [
      "3",
      "-1",
      `shift-${TONE_STEPS}`,
      `increase-${TONE_STEPS}`,
      `decrease-${TONE_STEPS}`,
      "shift--1",
      "SHIFT-1",
      "surfaces",
      "",
    ]) {
      expect(rules({ div: "x", dataTone: bad })).toContain("unknown-tone");
    }
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
    expect(rules({ div: "x", style: { backgroundColor: "white" } })).toContain(
      "raw-theme-value",
    );
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
    expect(rules({ div: "x", style: { color: "transparent" } })).not.toContain(
      "raw-theme-value",
    );
    expect(rules({ div: "x", style: { color: "currentColor" } })).not.toContain(
      "raw-theme-value",
    );
    expect(rules({ div: "x", style: { color: "inherit" } })).not.toContain(
      "raw-theme-value",
    );
    expect(
      rules({ div: "x", style: { backgroundColor: "none" } }),
    ).not.toContain("raw-theme-value");
  });

  it("does not flag reactive named colors", () => {
    expect(rules({ div: "x", style: { color: () => "red" } })).not.toContain(
      "raw-theme-value",
    );
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
    dataTone: "invalid-tone-word",
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
      rules({ div: "x", dataTone: "invalid-tone-word", _doctorDisable: true }),
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
      dataTone: "invalid-tone-word",
      _doctorDisable: ["unknown-tone"],
    });
    // unknown-tone suppressed
    expect(d.map((i) => i.rule)).not.toContain("unknown-tone");
    // inline-typography still fires
    expect(d.map((i) => i.rule)).toContain("inline-typography");
  });

  it("_doctorDisable: 'rule-id' (string) works like single-element array", () => {
    expect(
      rules({
        div: "x",
        dataTone: "invalid-tone-word",
        _doctorDisable: "unknown-tone",
      }),
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
      rules({ div: "x", dataTone: "invalid-tone-word", _doctorDisable: false }),
    ).toContain("unknown-tone");
    expect(
      rules({ div: "x", dataTone: "invalid-tone-word", _doctorDisable: null }),
    ).toContain("unknown-tone");
    expect(
      rules({
        div: "x",
        dataTone: "invalid-tone-word",
        _doctorDisable: undefined,
      }),
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
      diagnose({ p: "x", style: { fontSize: "20px" } }, { rules: [throwing] }),
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
    const d = diagnose({ div: "x", dataTone: "invalid-tone-word" });
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
        { div: "z", dataTone: "invalid-tone-word" }, // unknown-tone (warning)
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
    expect(rules({ span: "x", style: { opacity: "0" } })).not.toContain(
      "low-opacity",
    );
  });

  it("does not fire on opacity >= 0.6", () => {
    expect(rules({ span: "x", style: { opacity: "0.6" } })).not.toContain(
      "low-opacity",
    );
    expect(rules({ span: "x", style: { opacity: "1" } })).not.toContain(
      "low-opacity",
    );
  });

  it("does not fire on reactive opacity function", () => {
    expect(rules({ span: "x", style: { opacity: () => "0.3" } })).not.toContain(
      "low-opacity",
    );
  });

  it("does not fire on opacity inside pseudo-class (&:hover)", () => {
    // opacity in hover state is the enhanced UX — not a violation
    expect(
      rules({ span: "x", style: { "&:hover": { opacity: "0.3" } } }),
    ).not.toContain("low-opacity");
  });

  it("does not fire on pointer-events:none elements (decorative by construction)", () => {
    // A dimmed element that cannot be hovered or clicked is not an interactive
    // control — e.g. an absolutely-positioned search icon at 50% opacity.
    expect(
      rules({
        span: "x",
        style: { opacity: 0.5, pointerEvents: "none" },
      }),
    ).not.toContain("low-opacity");
    // Reactive pointer-events values resolve the same way.
    expect(
      rules({
        span: "x",
        style: { opacity: 0.5, pointerEvents: () => "none" },
      }),
    ).not.toContain("low-opacity");
  });

  it("does not fire on disabled controls (intentionally inoperable)", () => {
    // Out-of-month calendar days are disabled buttons dimmed to 0.4 — WCAG
    // exempts inactive controls from contrast/discoverability requirements.
    expect(
      rules({
        button: "1",
        disabled: true,
        style: { opacity: 0.4 },
      }),
    ).not.toContain("low-opacity");
    // A non-disabled control at the same opacity is still flagged.
    expect(
      rules({
        button: "1",
        style: { opacity: 0.4 },
      }),
    ).toContain("low-opacity");
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

  it("does not fire on void/decorative hosts with null content (legend swatches)", () => {
    // Chart/legend color chips set themed bg+color with no text — gap < 9 is
    // not a text-legibility problem.
    const element = {
      span: null,
      style: {
        color: (_l: unknown) => "var(--primary-0)",
        backgroundColor: (_l: unknown) => "var(--primary-4)",
      },
    };
    expect(rules(element)).not.toContain("low-contrast");
  });
});

describe("low-contrast on static var(--X-N) strings", () => {
  // themeColor() returns reactive functions, but a hand-written tree can set
  // color/backgroundColor to a literal var() string — the rule must compare
  // those too, through the same shift-gap logic (deferral: static literals
  // were previously invisible because only reactive functions were invoked).
  it("fires on a static same-family pair with a shift gap < 9", () => {
    const element = {
      div: "x",
      style: {
        color: "var(--neutral-3)",
        backgroundColor: "var(--neutral-9)",
      },
    };
    expect(rules(element)).toContain("low-contrast");
  });

  it("reports exactly one low-contrast diagnostic per element (no double-report)", () => {
    // Reactive themeColor() functions and static literals resolve through the
    // same single comparison — including a mixed pair — so an element can
    // never produce the diagnostic twice.
    const reactive = {
      div: "x",
      style: {
        color: (l: Parameters<typeof themeColor>[0]) =>
          themeColor(l, "shift-3"),
        backgroundColor: (l: Parameters<typeof themeColor>[0]) =>
          themeColor(l, "shift-9"),
      },
    };
    const staticPair = {
      div: "x",
      style: {
        color: "var(--neutral-3)",
        backgroundColor: "var(--neutral-9)",
      },
    };
    const mixed = {
      div: "x",
      style: {
        color: "var(--neutral-3)",
        backgroundColor: (l: Parameters<typeof themeColor>[0]) =>
          themeColor(l, "shift-9"),
      },
    };
    for (const element of [reactive, staticPair, mixed]) {
      const count = diagnose(element).filter(
        (d) => d.rule === "low-contrast",
      ).length;
      expect(count).toBe(1);
    }
  });

  it("does not fire on a static pair with a gap ≥ 9 or across families", () => {
    const wideGap = {
      div: "x",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
      },
    };
    expect(rules(wideGap)).not.toContain("low-contrast");

    const crossFamily = {
      div: "x",
      style: {
        color: "var(--error-3)",
        backgroundColor: "var(--success-9)",
      },
    };
    expect(rules(crossFamily)).not.toContain("low-contrast");
  });

  it("still compares static literals when runReactive is false", () => {
    // Static strings need no evaluation, so the comparison is meaningful even
    // with reactive execution disabled.
    const element = {
      div: "x",
      style: {
        color: "var(--neutral-3)",
        backgroundColor: "var(--neutral-9)",
      },
    };
    expect(rules(element, { runReactive: false })).toContain("low-contrast");
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

describe("low-opacity numeric values", () => {
  it("flags a numeric opacity below 0.6 (CSS-in-JS accepts numbers)", () => {
    expect(rules({ span: "x", style: { opacity: 0.4 } })).toContain(
      "low-opacity",
    );
  });

  it("does not flag numeric opacity at or above 0.6, or 0", () => {
    expect(rules({ span: "x", style: { opacity: 0.6 } })).not.toContain(
      "low-opacity",
    );
    // 0 is the documented hover-reveal base — never flagged.
    expect(rules({ span: "x", style: { opacity: 0 } })).not.toContain(
      "low-opacity",
    );
  });

  it("downgrades to info when &:hover restores opacity (numeric 1)", () => {
    const issue = diagnose({
      span: "x",
      style: { opacity: 0.4, "&:hover": { opacity: 1 } },
    }).find((d) => d.rule === "low-opacity");
    expect(issue?.severity).toBe("info");
  });
});

describe("cycle guards", () => {
  it("diagnose() terminates on a self-referencing element tree", () => {
    const element: Record<string, unknown> = { div: null };
    element.div = element; // circular content
    expect(() => diagnose(element)).not.toThrow();
    // The element itself is still analyzed exactly once.
    expect(diagnose(element).filter((d) => d.rule === "unknown-tag")).toEqual(
      [],
    );
  });

  it("diagnose() terminates on a mutually-referencing pair", () => {
    const a: Record<string, unknown> = { div: null };
    const b: Record<string, unknown> = { span: null };
    a.div = [b];
    b.span = [a];
    expect(() => diagnose([a])).not.toThrow();
  });

  it("fix() terminates on a circular tree and preserves the cycle in the clone", () => {
    const element: Record<string, unknown> = { div: null };
    element.div = element;
    const result = fix(element);
    expect(result.tree).not.toBe(element);
    const clone = result.tree as Record<string, unknown>;
    expect(clone.div).toBe(clone); // cycle survived the clone
  });

  it("diagnose() terminates when a reactive function returns itself", () => {
    const selfReturning = (): unknown => selfReturning;
    expect(() => diagnose({ div: selfReturning })).not.toThrow();
  });

  it("diagnose() terminates on mutually-recursive reactive functions", () => {
    const first = (): unknown => second;
    const second = (): unknown => first;
    expect(() => diagnose({ div: first })).not.toThrow();
  });

  it("diagnose() still analyzes a shared reactive function in each sibling branch", () => {
    // The fn-cycle guard is active only while the function's subtree is being
    // walked — it must not dedup a shared function across sibling branches.
    const shared = () => [{ li: "a" }, { li: "b" }]; // missing-key
    const issues = diagnose({ div: [{ ul: shared }, { ul: shared }] }).filter(
      (d) => d.rule === "missing-key",
    );
    expect(issues).toHaveLength(2);
  });

  it("fix() terminates when a reactive function returns itself", () => {
    const selfReturning = (): unknown => selfReturning;
    expect(() => fix({ div: selfReturning })).not.toThrow();
  });
});

describe("unknown-tag fires per unknown key", () => {
  it("reports every unknown key, not just single-key objects", () => {
    const issues = diagnose({ dvi: "x", spna: "y", buttn: "z" }).filter(
      (d) => d.rule === "unknown-tag",
    );
    expect(issues).toHaveLength(3);
    expect(issues.map((d) => d.message).join("\n")).toContain('"dvi"');
    expect(issues.map((d) => d.message).join("\n")).toContain('"spna"');
    expect(issues.map((d) => d.message).join("\n")).toContain('"buttn"');
  });

  it("still reports a single unknown key exactly once", () => {
    const issues = diagnose({ dvi: "typo" }).filter(
      (d) => d.rule === "unknown-tag",
    );
    expect(issues).toHaveLength(1);
  });
});

describe("custom rules that throw", () => {
  it("produces an info diagnostic instead of failing silently", () => {
    const throwingRule: CustomRule = {
      id: "always-throws",
      severity: "warning",
      check: () => {
        throw new Error("kaboom");
      },
    };
    const issues = diagnose({ div: "x" }, { rules: [throwingRule] }).filter(
      (d) => d.rule === "always-throws",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("info");
    expect(issues[0].message).toContain("kaboom");
  });
});

describe("regression: rawHtml() content is not walked as unknown tags", () => {
  // Regression for a bug where a RawHTML class instance passed isPlainObject,
  // so its `__domphyRawHTML`/`html` keys were each reported as unknown-tag.
  it("{ div: rawHtml(...) } produces no diagnostics", () => {
    expect(diagnose({ div: rawHtml("<b>x</b>") })).toEqual([]);
  });

  it("rawHtml inside a child array is also skipped", () => {
    expect(diagnose({ div: [rawHtml("<i>y</i>"), { span: "ok" }] })).toEqual(
      [],
    );
  });

  it("rawHtml at the root is skipped", () => {
    expect(diagnose(rawHtml("<p>root</p>"))).toEqual([]);
  });
});

describe("regression: raw-theme-value covers direct-only color props and modern color functions", () => {
  // Regression for a bug where caretColor/accentColor/columnRuleColor/
  // textDecorationColor were only in the named-color set, which requires a
  // non-literal value — so `caretColor: "#fff"` was invisible to the rule.
  it("flags a hex literal on caretColor", () => {
    const issues = diagnose({
      input: null,
      style: { caretColor: "#fff" },
    }).filter((d) => d.rule === "raw-theme-value");
    expect(issues).toHaveLength(1);
  });

  it("flags an rgb() literal on accentColor", () => {
    expect(
      rules({ div: "x", style: { accentColor: "rgb(10, 20, 30)" } }),
    ).toContain("raw-theme-value");
  });

  it("flags hex literals on columnRuleColor and textDecorationColor", () => {
    expect(rules({ div: "x", style: { columnRuleColor: "#123" } })).toContain(
      "raw-theme-value",
    );
    expect(
      rules({ p: "x", style: { textDecorationColor: "#123456" } }),
    ).toContain("raw-theme-value");
  });

  it("flags modern color functions: oklch/oklab/lab/lch/color/color-mix", () => {
    for (const value of [
      "oklch(0.7 0.1 240)",
      "oklab(0.6 0.1 -0.1)",
      "lab(50% 40 20)",
      "lch(60% 50 30)",
      "color(display-p3 1 0 0)",
      "color-mix(in srgb, red 50%, blue)",
    ]) {
      expect(rules({ div: "x", style: { color: value } })).toContain(
        "raw-theme-value",
      );
    }
  });

  it("still flags named colors on caretColor (named-color branch unaffected)", () => {
    expect(rules({ input: null, style: { caretColor: "red" } })).toContain(
      "raw-theme-value",
    );
  });

  it("does not flag semantic keywords on the newly-covered props", () => {
    expect(
      rules({ input: null, style: { caretColor: "currentColor" } }),
    ).not.toContain("raw-theme-value");
    expect(rules({ div: "x", style: { accentColor: "auto" } })).not.toContain(
      "raw-theme-value",
    );
  });
});

describe("regression: missing-color only matches themeColor() var shape", () => {
  // Regression for a bug where any `var(` substring counted as "uses
  // themeColor" — e.g. `transform: "translateX(var(--x))"` tripped the rule.
  // themeColor() emits exactly `var(--<family>-<N>)` (see themeVars()).
  it("does not fire on a generic custom property like var(--x)", () => {
    expect(
      rules({ div: "x", style: { transform: "translateX(var(--x))" } }),
    ).not.toContain("missing-color");
  });

  it("does not fire on themeSize() output (var(--fontSize-N) is not a color)", () => {
    expect(
      rules({ p: "x", style: { fontSize: "var(--fontSize-4)" } }),
    ).not.toContain("missing-color");
  });

  it("still fires on a real theme color var", () => {
    expect(
      rules({ div: "x", style: { backgroundColor: "var(--neutral-0)" } }),
    ).toContain("missing-color");
  });
});

describe("regression: fix() walks reactive content but only fixes static content", () => {
  // Regression for a bug where walkFix never evaluated reactive content
  // functions. The fix CANNOT be applied inside a closure (the function
  // regenerates its return value on every call, so the mutation would not
  // persist into the returned tree) — the honest behavior is: no applied fix,
  // issue still reported, and no mutation of closure-captured objects.
  it("void-content inside a reactive list is reported, not claimed as fixed", () => {
    const result = fix({ ul: () => [{ input: "oops", _key: 1 }] });
    expect(result.applied.map((a) => a.rule)).not.toContain("void-content");
    expect(result.report.issues.map((i) => i.rule)).toContain("void-content");
  });

  it("does not mutate objects captured by the reactive closure", () => {
    const items = [{ input: "oops", _key: 1 }];
    const result = fix({ ul: () => items });
    expect(items[0].input).toBe("oops"); // untouched — fixing would corrupt caller state
    expect(result.report.issues.map((i) => i.rule)).toContain("void-content");
  });

  it("still fixes statically declared void content", () => {
    const result = fix({ div: [{ input: "oops" }] });
    expect(result.applied.map((a) => a.rule)).toContain("void-content");
    expect(result.report.issues.map((i) => i.rule)).not.toContain(
      "void-content",
    );
  });

  it("respects runReactive: false (reactive content not evaluated)", () => {
    let called = false;
    const result = fix(
      {
        ul: () => {
          called = true;
          return [{ input: "oops", _key: 1 }];
        },
      },
      { runReactive: false },
    );
    expect(called).toBe(false);
    expect(result.applied).toEqual([]);
  });
});

describe("regression: reactive style literals reach typography/color/spacing rules", () => {
  // Regression for a bug where the style-prop walker only checked static
  // strings, so `(l) => "20px"` / `() => "#fff"` / `() => "16px"` bypassed
  // inline-typography, raw-theme-value, and raw-spacing-value even with
  // runReactive on.
  it("flags a reactive fontSize literal", () => {
    expect(rules({ p: "x", style: { fontSize: () => "20px" } })).toContain(
      "inline-typography",
    );
  });

  it("flags a reactive color hex literal", () => {
    expect(rules({ div: "x", style: { color: () => "#fff" } })).toContain(
      "raw-theme-value",
    );
  });

  it("flags a reactive padding literal", () => {
    expect(rules({ div: "x", style: { padding: () => "16px" } })).toContain(
      "raw-spacing-value",
    );
  });

  it("does not flag themeSize()/themeColor() reactive results", () => {
    const fontSizeRules = rules({
      p: "x",
      style: { fontSize: (l: unknown) => themeSize(l as never, "inherit") },
    });
    expect(fontSizeRules).not.toContain("inline-typography");
    const colorIssues = diagnose({
      div: "x",
      style: {
        backgroundColor: (l: unknown) => themeColor(l as never, "surface"),
        color: (l: unknown) => themeColor(l as never, "text"),
      },
    });
    expect(colorIssues.map((d) => d.rule)).not.toContain("raw-theme-value");
  });

  it("does not evaluate reactive style functions when runReactive is false", () => {
    expect(
      rules(
        { p: "x", style: { fontSize: () => "20px" } },
        { runReactive: false },
      ),
    ).not.toContain("inline-typography");
  });

  it("skips a reactive style function that throws without a runtime", () => {
    expect(() =>
      diagnose({
        p: "x",
        style: {
          fontSize: () => {
            throw new Error("no runtime");
          },
        },
      }),
    ).not.toThrow();
  });
});

describe("regression: raw-spacing-value catches shorthands, negatives, and borderRadius", () => {
  // Regression for a bug where the anchored single-value regex missed
  // multi-value shorthands and negatives, and borderRadius was not checked at
  // all (the component geometry formula routes it through themeSpacing).
  it("flags a multi-value shorthand when any token is a literal", () => {
    expect(rules({ div: "x", style: { padding: "8px 16px" } })).toContain(
      "raw-spacing-value",
    );
  });

  it("flags a negative literal", () => {
    expect(rules({ div: "x", style: { marginTop: "-8px" } })).toContain(
      "raw-spacing-value",
    );
  });

  it("flags borderRadius literals", () => {
    expect(rules({ div: "x", style: { borderRadius: "8px" } })).toContain(
      "raw-spacing-value",
    );
  });

  it("keeps calc()/var()/percentage/unitless-zero/keyword values clean", () => {
    expect(rules({ div: "x", style: { padding: "calc(1em)" } })).not.toContain(
      "raw-spacing-value",
    );
    expect(
      rules({ div: "x", style: { padding: "var(--spacing-2)" } }),
    ).not.toContain("raw-spacing-value");
    expect(rules({ div: "x", style: { gap: "50%" } })).not.toContain(
      "raw-spacing-value",
    );
    expect(rules({ div: "x", style: { margin: "0 auto" } })).not.toContain(
      "raw-spacing-value",
    );
    expect(rules({ div: "x", style: { padding: "0" } })).not.toContain(
      "raw-spacing-value",
    );
  });

  it("keeps themeSpacing()/themeFluidSpacing() reactive output clean", () => {
    expect(
      rules({ div: "x", style: { padding: () => "calc(1.5em)" } }),
    ).not.toContain("raw-spacing-value");
  });
});

describe("regression: unstable-key catches string-form index keys", () => {
  // Regression for a bug where only numeric keys equal to the index were
  // flagged — `_key: "0"`, `_key: "1"` (string form of the same anti-pattern)
  // escaped the check.
  it("flags string index keys", () => {
    expect(
      rules({
        ul: () => [
          { li: "a", _key: "0" },
          { li: "b", _key: "1" },
        ],
      }),
    ).toContain("unstable-key");
  });

  it("flags mixed number/string index keys", () => {
    expect(
      rules({
        ul: () => [
          { li: "a", _key: 0 },
          { li: "b", _key: "1" },
        ],
      }),
    ).toContain("unstable-key");
  });

  it("does not flag stable non-index string keys", () => {
    expect(
      rules({
        ul: () => [
          { li: "a", _key: "row-a" },
          { li: "b", _key: "row-b" },
        ],
      }),
    ).not.toContain("unstable-key");
  });
});

describe("invalid-nesting", () => {
  it("flags flow/block content inside <p> as an error", () => {
    for (const child of [
      "div",
      "p",
      "h2",
      "ul",
      "blockquote",
      "pre",
      "table",
      "form",
      "section",
      "hr",
      "address",
    ]) {
      const d = diagnose({ p: [{ [child]: "x" }] });
      const issue = d.find((i) => i.rule === "invalid-nesting");
      expect(issue, `<${child}> inside <p>`).toBeDefined();
      expect(issue?.severity).toBe("error");
    }
  });

  it("allows phrasing content inside <p>", () => {
    for (const child of ["span", "a", "strong", "small", "em", "code"]) {
      expect(rules({ p: [{ [child]: "x" }] })).not.toContain("invalid-nesting");
    }
    // text content is always fine
    expect(rules({ p: "plain text" })).toEqual([]);
  });

  it("flags interactive content inside interactive content", () => {
    expect(rules({ a: [{ a: "x", href: "/" }], href: "/" })).toContain(
      "invalid-nesting",
    );
    expect(rules({ a: [{ button: "x" }], href: "/" })).toContain(
      "invalid-nesting",
    );
    expect(rules({ button: [{ a: "x", href: "/" }] })).toContain(
      "invalid-nesting",
    );
    expect(rules({ button: [{ button: "x" }] })).toContain("invalid-nesting");
    // span inside a/button is phrasing content — fine
    expect(rules({ a: [{ span: "x" }], href: "/" })).not.toContain(
      "invalid-nesting",
    );
    expect(rules({ button: [{ span: "x" }] })).not.toContain("invalid-nesting");
  });

  it("flags list/table/select children with the wrong parent", () => {
    // li outside ul/ol/menu
    expect(rules({ div: [{ li: "x" }] })).toContain("invalid-nesting");
    expect(rules({ p: [{ li: "x" }] })).toContain("invalid-nesting");
    expect(rules({ ul: [{ li: "x" }] })).not.toContain("invalid-nesting");
    expect(rules({ ol: [{ li: "x" }] })).not.toContain("invalid-nesting");
    expect(rules({ menu: [{ li: "x" }] })).not.toContain("invalid-nesting");
    // dt/dd outside dl
    expect(rules({ div: [{ dt: "x" }] })).toContain("invalid-nesting");
    expect(rules({ div: [{ dd: "x" }] })).toContain("invalid-nesting");
    expect(rules({ dl: [{ dt: "x" }, { dd: "y" }] })).not.toContain(
      "invalid-nesting",
    );
    // tr outside table/thead/tbody/tfoot
    expect(rules({ div: [{ tr: "x" }] })).toContain("invalid-nesting");
    expect(rules({ table: [{ tr: [{ td: "x" }] }] })).not.toContain(
      "invalid-nesting",
    );
    // td/th outside tr
    expect(rules({ table: [{ td: "x" }] })).toContain("invalid-nesting");
    expect(rules({ table: [{ th: "x" }] })).toContain("invalid-nesting");
    expect(rules({ tr: [{ td: "x" }, { th: "y" }] })).not.toContain(
      "invalid-nesting",
    );
    // option outside select/optgroup/datalist
    expect(rules({ div: [{ option: "x" }] })).toContain("invalid-nesting");
    expect(rules({ select: [{ option: "x" }] })).not.toContain(
      "invalid-nesting",
    );
    expect(rules({ datalist: [{ option: "x" }] })).not.toContain(
      "invalid-nesting",
    );
    expect(rules({ select: [{ optgroup: [{ option: "x" }] }] })).not.toContain(
      "invalid-nesting",
    );
    // table sections outside table
    for (const section of ["thead", "tbody", "tfoot", "caption", "colgroup"]) {
      expect(rules({ div: [{ [section]: null }] })).toContain(
        "invalid-nesting",
      );
    }
    expect(
      rules({
        table: [
          { caption: "c" },
          { colgroup: null },
          { thead: [{ tr: [{ th: "h" }] }] },
          { tbody: [{ tr: [{ td: "d" }] }] },
          { tfoot: null },
        ],
      }),
    ).not.toContain("invalid-nesting");
  });

  it("flags non-li element children of ul/ol", () => {
    expect(rules({ ul: [{ div: "x" }] })).toContain("invalid-nesting");
    expect(rules({ ol: [{ span: "x" }] })).toContain("invalid-nesting");
    // li, script, template are allowed
    expect(
      rules({ ul: [{ li: "x" }, { script: null }, { template: null }] }),
    ).not.toContain("invalid-nesting");
    // text children are not element-vs-element nesting — exempt
    expect(rules({ ul: ["text"] })).not.toContain("invalid-nesting");
  });

  it("exempts reactive-function content (invisible to the static tree)", () => {
    // div inside p via a reactive fn — must NOT be flagged
    expect(rules({ p: () => [{ div: "x" }] })).not.toContain("invalid-nesting");
    // li produced by a reactive fn — must NOT be flagged for a missing parent
    expect(rules({ div: (_l: unknown) => [{ li: "x" }] })).not.toContain(
      "invalid-nesting",
    );
  });

  it("exempts rawHtml content", () => {
    expect(rules({ p: [rawHtml("<div>x</div>")] })).not.toContain(
      "invalid-nesting",
    );
  });

  it("does not apply HTML content-model rules inside <svg> subtrees", () => {
    // a-in-a is an HTML violation but legal inside SVG
    expect(rules({ svg: [{ a: [{ a: "x" }] }] })).not.toContain(
      "invalid-nesting",
    );
    // SVG-only tags are never checked against HTML parents or vice versa
    expect(
      rules({ svg: [{ g: [{ rect: null }, { circle: null }] }] }),
    ).not.toContain("invalid-nesting");
  });

  it("re-applies HTML rules inside foreignObject", () => {
    expect(
      rules({ svg: [{ foreignObject: [{ p: [{ div: "x" }] }] }] }),
    ).toContain("invalid-nesting");
    // valid HTML inside foreignObject stays clean
    expect(
      rules({ svg: [{ foreignObject: [{ div: [{ p: "x" }] }] }] }),
    ).not.toContain("invalid-nesting");
  });

  it("names both tags in the message", () => {
    const d = diagnose({ p: [{ div: "x" }] });
    const issue = d.find((i) => i.rule === "invalid-nesting");
    expect(issue?.message).toContain("<div>");
    expect(issue?.message).toContain("<p>");
  });
});

describe("click-without-keyboard", () => {
  it("warns on a non-interactive element with onClick and no keyboard handler", () => {
    const d = diagnose({ div: "x", onClick: () => {} });
    const issue = d.find((i) => i.rule === "click-without-keyboard");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    expect(issue?.message).toContain("<div>");
  });

  it("exempts natively interactive tags", () => {
    for (const tag of [
      "button",
      "a",
      "dialog",
      "input",
      "select",
      "textarea",
      "summary",
      "label",
    ]) {
      expect(
        rules({ [tag]: tag === "input" ? null : "x", onClick: () => {} }),
      ).not.toContain("click-without-keyboard");
    }
  });

  it("exempts elements with a keyboard handler", () => {
    expect(
      rules({ div: "x", onClick: () => {}, onKeyDown: () => {} }),
    ).not.toContain("click-without-keyboard");
    expect(
      rules({ div: "x", onClick: () => {}, onKeyUp: () => {} }),
    ).not.toContain("click-without-keyboard");
    expect(
      rules({ div: "x", onClick: () => {}, onKeyPress: () => {} }),
    ).not.toContain("click-without-keyboard");
  });

  it("exempts hidden elements in both aria attribute forms", () => {
    // Literal DOM name and the camelCase form core maps (AttributeList).
    expect(
      rules({ div: null, onClick: () => {}, "aria-hidden": "true" }),
    ).not.toContain("click-without-keyboard");
    expect(
      rules({ div: null, onClick: () => {}, ariaHidden: "true" }),
    ).not.toContain("click-without-keyboard");
    expect(rules({ div: null, onClick: () => {}, hidden: true })).not.toContain(
      "click-without-keyboard",
    );
  });

  it("exempts elements with an interactive role or tabIndex", () => {
    expect(
      rules({ div: "x", onClick: () => {}, role: "button" }),
    ).not.toContain("click-without-keyboard");
    expect(rules({ div: "x", onClick: () => {}, role: "tab" })).not.toContain(
      "click-without-keyboard",
    );
    expect(rules({ div: "x", onClick: () => {}, tabIndex: 0 })).not.toContain(
      "click-without-keyboard",
    );
    expect(rules({ div: "x", onClick: () => {}, tabindex: 0 })).not.toContain(
      "click-without-keyboard",
    );
  });

  it("exempts hidden elements", () => {
    expect(rules({ div: "x", onClick: () => {}, hidden: true })).not.toContain(
      "click-without-keyboard",
    );
    expect(
      rules({ div: "x", onClick: () => {}, "aria-hidden": "true" }),
    ).not.toContain("click-without-keyboard");
    expect(
      rules({
        div: "x",
        onClick: () => {},
        style: { display: "none" },
      }),
    ).not.toContain("click-without-keyboard");
  });

  it("does not fire without an onClick handler", () => {
    expect(rules({ div: "x" })).toEqual([]);
  });
});

describe("missing-required-attribute", () => {
  it("errors on <img> without alt", () => {
    const d = diagnose({ img: null, src: "x.png" });
    const issue = d.find((i) => i.rule === "missing-required-attribute");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("accepts alt (even empty), aria-label/labelledby, or a presentation role", () => {
    expect(rules({ img: null, src: "x.png", alt: "A picture" })).toEqual([]);
    // empty alt is valid (decorative image)
    expect(rules({ img: null, src: "x.png", alt: "" })).toEqual([]);
    expect(
      rules({ img: null, src: "x.png", "aria-label": "A picture" }),
    ).toEqual([]);
    expect(
      rules({ img: null, src: "x.png", "aria-labelledby": "caption-id" }),
    ).toEqual([]);
    // camelCase aria attributes — the form core's AttributeList maps to the
    // DOM names — must count the same way.
    expect(rules({ img: null, src: "x.png", ariaLabel: "A picture" })).toEqual(
      [],
    );
    expect(
      rules({ img: null, src: "x.png", ariaLabelledby: "caption-id" }),
    ).toEqual([]);
    expect(rules({ img: null, src: "x.png", role: "presentation" })).toEqual(
      [],
    );
    expect(rules({ img: null, src: "x.png", role: "none" })).toEqual([]);
  });

  it("errors on <iframe> without title", () => {
    const d = diagnose({ iframe: null, src: "https://example.com" });
    const issue = d.find((i) => i.rule === "missing-required-attribute");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
    expect(
      rules({ iframe: null, src: "https://example.com", title: "Example" }),
    ).toEqual([]);
  });

  it("warns on <a> with onClick but no href and no role", () => {
    const d = diagnose({ a: "x", onClick: () => {} });
    const issue = d.find((i) => i.rule === "missing-required-attribute");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    // href or role clears it
    expect(rules({ a: "x", onClick: () => {}, href: "/page" })).not.toContain(
      "missing-required-attribute",
    );
    expect(rules({ a: "x", onClick: () => {}, role: "button" })).not.toContain(
      "missing-required-attribute",
    );
    // a plain link without onClick is fine
    expect(rules({ a: "x", href: "/page" })).toEqual([]);
  });
});

describe("_doctorDisable suppresses the new rules", () => {
  it("suppresses by rule id, array of ids, and true", () => {
    expect(
      rules({ p: [{ div: "x", _doctorDisable: "invalid-nesting" }] }),
    ).not.toContain("invalid-nesting");
    expect(
      rules({
        img: null,
        src: "x.png",
        _doctorDisable: ["missing-required-attribute"],
      }),
    ).toEqual([]);
    expect(
      rules({ div: "x", onClick: () => {}, _doctorDisable: true }),
    ).toEqual([]);
  });
});

describe("unused-doctor-disable", () => {
  it("flags a stale single-id suppression (info severity, structure category)", () => {
    const d = diagnose({ div: "x", _doctorDisable: "low-contrast" });
    const issue = d.find((i) => i.rule === "unused-doctor-disable");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("info");
    expect(issue?.category).toBe("structure");
    expect(issue?.message).toContain('"low-contrast"');
  });

  it("reports only the stale entries of a partially-used array", () => {
    // inline-typography fires and is suppressed (used); low-contrast never
    // fires (stale) — only the stale one is reported.
    const d = diagnose({
      p: "x",
      style: { fontSize: "20px" },
      _doctorDisable: ["inline-typography", "low-contrast"],
    });
    expect(d.map((i) => i.rule)).not.toContain("inline-typography");
    const stale = d.filter((i) => i.rule === "unused-doctor-disable");
    expect(stale).toHaveLength(1);
    expect(stale[0].message).toContain('"low-contrast"');
    expect(stale[0].message).not.toContain('"inline-typography"');
  });

  it("flags a typo'd unknown rule id as matching no known rule", () => {
    const d = diagnose({ div: "x", _doctorDisable: "low-contrst" });
    const issue = d.find((i) => i.rule === "unused-doctor-disable");
    expect(issue).toBeDefined();
    expect(issue?.message).toContain("match no known rule");
    expect(issue?.message).toContain('"low-contrst"');
  });

  it("flags _doctorDisable: true when nothing was suppressed", () => {
    const d = diagnose({ div: "x", _doctorDisable: true });
    const issue = d.find((i) => i.rule === "unused-doctor-disable");
    expect(issue).toBeDefined();
    expect(issue?.message).toContain("true");
  });

  it("does not flag _doctorDisable: true when it suppressed a diagnostic", () => {
    const d = diagnose({
      div: "x",
      dataTone: "invalid-tone-word",
      _doctorDisable: true,
    });
    expect(d.map((i) => i.rule)).not.toContain("unknown-tone");
    expect(d.map((i) => i.rule)).not.toContain("unused-doctor-disable");
  });

  it("produces no diagnostic when every named entry suppressed something", () => {
    const d = diagnose({
      p: "x",
      style: { fontSize: "20px" },
      dataTone: "invalid-tone-word",
      _doctorDisable: ["inline-typography", "unknown-tone"],
    });
    expect(d).toEqual([]);
  });

  it("does not flag suppression of array-level diagnostics fired at the element's own path", () => {
    // missing-key fires at the ul's path, so suppressing it there is used.
    const d = diagnose({
      ul: () => [{ li: "a" }, { li: "b" }],
      _doctorDisable: ["missing-key"],
    });
    expect(d).toEqual([]);
  });

  it("recognizes custom rule ids as known", () => {
    const customRule: CustomRule = {
      id: "my-rule",
      severity: "warning",
      check: () => [],
    };
    // "my-rule" is known but never fires → stale-known, not stale-unknown.
    const d = diagnose(
      { div: "x", _doctorDisable: "my-rule" },
      { rules: [customRule] },
    );
    const issue = d.find((i) => i.rule === "unused-doctor-disable");
    expect(issue).toBeDefined();
    expect(issue?.message).toContain("suppress nothing");
    expect(issue?.message).not.toContain("match no known rule");
  });

  it("is suppressed by a self-referencing entry on the same element", () => {
    const d = diagnose({
      div: "x",
      _doctorDisable: ["unused-doctor-disable", "low-contrast"],
    });
    expect(d).toEqual([]);
  });

  it("is subject to only/exclude filtering like any other rule", () => {
    const tree = { div: "x", _doctorDisable: "low-contrst" };
    expect(diagnose(tree, { exclude: ["unused-doctor-disable"] })).toEqual([]);
    const only = diagnose(tree, { only: ["unused-doctor-disable"] });
    expect(only).toHaveLength(1);
    expect(only[0].rule).toBe("unused-doctor-disable");
  });

  it("exclude of the suppressed rule does NOT make its suppression stale", () => {
    // Pinned behavior: only/exclude filter the emitted output AFTER the walk;
    // suppression usage is measured against what the rules actually produced.
    // Excluding unknown-tone hides its diagnostic from the report, but the
    // suppression still consumed a produced diagnostic, so it stays "used".
    const d = diagnose(
      {
        div: "x",
        dataTone: "invalid-tone-word",
        _doctorDisable: "unknown-tone",
      },
      { exclude: ["unknown-tone"] },
    );
    expect(d).toEqual([]);
  });
});
