import { ElementNode, rawHtml, toState } from "@domphy/core";
import {
  CONTRAST_SPAN,
  ElementTones,
  FONT_FAMILIES,
  FONT_WEIGHTS,
  LETTER_SPACINGS,
  resolveToneStep,
  TONE_STEPS,
  themeColor,
  themeFont,
  themeLetterSpacing,
  themeSize,
  themeWeight,
} from "@domphy/theme";
import { describe, expect, it } from "vitest";
import { type CustomRule, diagnose, fix, format } from "../src/index";

const rules = (tree: unknown, opts?: Parameters<typeof diagnose>[1]) =>
  diagnose(tree, opts).map((d) => d.rule);

// The 23 rules the doctor is contracted to implement. A crafted input below
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
  "descendant-color-override",
  "unused-doctor-disable",
] as const;

describe("rule coverage (all 23 rules fire and no extras exist)", () => {
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
    // The background is a GRADIENT, so low-contrast has no comparable pair to
    // measure and color-shift-minimum is the rule that covers this surface. A
    // plain `backgroundColor: var(--…)` would be measured by low-contrast, and
    // color-shift-minimum defers to it rather than reporting the same pair
    // twice.
    "color-shift-minimum": {
      div: "x",
      dataTone: "shift-0",
      style: {
        backgroundColor: (_l: unknown) =>
          "linear-gradient(var(--test-neutral-0), var(--test-neutral-1))",
        color: (_l: unknown) => "var(--test-neutral-4)",
      },
    },
    "invalid-nesting": { p: [{ div: "x" }] },
    "click-without-keyboard": { div: "x", onClick: () => {} },
    "missing-required-attribute": { img: null, src: "x.png" },
    "descendant-color-override": {
      div: [
        {
          small: "x",
          $: [{ style: { color: (_l: unknown) => "var(--test-neutral-10)" } }],
        },
      ],
      style: { "& small": { color: (_l: unknown) => "var(--test-neutral-8)" } },
    },
    "unused-doctor-disable": { div: "x", _doctorDisable: "low-contrst" },
  };

  it("each of the 23 rule ids is produced by its crafted input", () => {
    for (const rule of EXPECTED_RULES) {
      expect(rules(samplesByRule[rule])).toContain(rule);
    }
  });

  it("the union of all produced rule ids equals exactly the 23 expected rules", () => {
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

describe("low-contrast inside nested selector blocks", () => {
  // Truth source: the CSS cascade. A nested block is a second painted state of
  // the same element, and a declaration it omits keeps the value from the flat
  // block — so `&:hover { background-color }` alone paints the base block's
  // `color` on the hover background. The rule only ever read the flat
  // properties, so the most common real regression (a hover background walking
  // up toward the text tone) was invisible.
  it("fires when a hover block only swaps the background, inheriting the base color", () => {
    const element = {
      button: "Save",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&:hover": { backgroundColor: "var(--neutral-8)" },
      },
    };
    const diags = diagnose(element).filter((d) => d.rule === "low-contrast");
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("&:hover");
    expect(diags[0].message).toContain("gap is 1");
  });

  it("fires when a nested block sets both properties too close together", () => {
    const element = {
      button: "Save",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&:active": {
          color: "var(--neutral-5)",
          backgroundColor: "var(--neutral-3)",
        },
      },
    };
    expect(rules(element)).toContain("low-contrast");
  });

  it("stays silent when the nested block keeps a ≥9 gap", () => {
    const element = {
      button: "Save",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&:hover": { backgroundColor: "var(--neutral-0)" },
      },
    };
    expect(rules(element)).not.toContain("low-contrast");
  });

  // At-rule blocks are the same shape and cascade the same way.
  it("checks @media blocks too", () => {
    const element = {
      div: "x",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "@media (prefers-color-scheme: dark)": {
          backgroundColor: "var(--neutral-7)",
        },
      },
    };
    expect(rules(element)).toContain("low-contrast");
  });

  it("does not fire on a null-content decorative host (same exemption as the flat rule)", () => {
    const element = {
      span: null,
      style: {
        color: "var(--primary-0)",
        backgroundColor: "var(--primary-0)",
        "&:hover": { backgroundColor: "var(--primary-4)" },
      },
    };
    expect(rules(element)).not.toContain("low-contrast");
  });

  // Truth source: measured WCAG 2.1 relative-luminance contrast on the default
  // neutral ramp — shift-9 text reads 4.95:1 on shift-0, 4.23:1 on shift-1 and
  // 3.58:1 on shift-2. The ≥9 threshold is therefore calibrated against a
  // shift-0 surface, so ANY non-zero surface anchor scores a gap < 9 — including
  // the ±1/±2 interactive delta the design system sanctions. The nested finding
  // is real but the threshold cannot separate a regression from a sanctioned
  // transient state, so it is reported without blocking.
  it("reports a nested block at info while the flat resting pair stays a warning", () => {
    const flat = diagnose({
      div: "x",
      style: { color: "var(--neutral-9)", backgroundColor: "var(--neutral-2)" },
    }).filter((d) => d.rule === "low-contrast");
    expect(flat).toHaveLength(1);
    expect(flat[0].severity).toBe("warning");

    const nested = diagnose({
      div: "x",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&:hover": { backgroundColor: "var(--neutral-2)" },
      },
    }).filter((d) => d.rule === "low-contrast");
    expect(nested).toHaveLength(1);
    expect(nested[0].severity).toBe("info");
  });

  // Truth source: WCAG 2.1 SC 1.4.3 "Incidental" — text that is part of an
  // INACTIVE user interface component has no contrast requirement.
  it.each([
    ["&[disabled]", "&[disabled]"],
    ["&[aria-disabled=true]", "&[aria-disabled=true]"],
    ["& option[disabled]", "& option[disabled]"],
    ["&:disabled", "&:disabled"],
  ])("exempts the inactive-component block %s", (_label, selector) => {
    const element = {
      button: "Save",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        [selector]: {
          color: "var(--neutral-8)",
          backgroundColor: "var(--neutral-2)",
        },
      },
    };
    expect(rules(element)).not.toContain("low-contrast");
  });

  // `:not([disabled])` selects the ENABLED state — the substring must not
  // exempt the very state the block styles.
  it("still checks a hover block guarded by :not([disabled])", () => {
    const element = {
      button: "Save",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&:hover:not([disabled])": { backgroundColor: "var(--neutral-2)" },
      },
    };
    expect(rules(element)).toContain("low-contrast");
  });

  // Truth source: the CSS pseudo-element rendering model. `::backdrop` and the
  // scrollbar pseudo-elements paint a box and never a glyph, so a `color` in
  // those blocks (inherited or declared) reaches no text at all.
  it.each([
    "&::backdrop",
    "&::-webkit-scrollbar-thumb",
    "&::-webkit-resizer",
  ])("exempts %s, which paints a box and no text", (selector) => {
    const element = {
      dialog: "x",
      style: {
        color: "var(--neutral-10)",
        backgroundColor: "var(--neutral-0)",
        [selector]: { backgroundColor: "var(--neutral-2)" },
      },
    };
    expect(rules(element)).not.toContain("low-contrast");
  });

  // `::before`/`::after` render exactly what `content` puts there.
  it("exempts a ::after block whose content is empty, but not one with text", () => {
    const decorative = {
      div: "x",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&::after": { content: '""', backgroundColor: "var(--neutral-4)" },
      },
    };
    expect(rules(decorative)).not.toContain("low-contrast");

    const textual = {
      div: "x",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&::after": { content: '"/"', color: "var(--neutral-4)" },
      },
    };
    expect(rules(textual)).toContain("low-contrast");
  });

  // ::placeholder, ::selection, ::marker and ::first-line DO render text.
  it("still checks ::placeholder, which renders text", () => {
    const element = {
      textarea: "x",
      style: {
        color: "var(--neutral-9)",
        backgroundColor: "var(--neutral-0)",
        "&::placeholder": { color: "var(--neutral-7)" },
      },
    };
    expect(rules(element)).toContain("low-contrast");
  });
});

describe("descendant-color-override narrowing", () => {
  // The patch a real descendant carries, reduced to what the rule reads: a
  // `$` entry whose style declares the property the ancestor block also sets.
  const colorPatch = { style: { color: (_l: unknown) => "var(--neutral-10)" } };

  // Truth source: CSS selector specificity (W3C Selectors L4 §17) held against
  // the two selectors Domphy actually generates — measured from
  // ElementNode.generateCSS(): a patch emits `.<generated> { color: … }` =
  // (0,1,0), while a scoped block emits `.<generated> small { … }` = (0,1,1)
  // (the class name itself is generated and its shape is not load-bearing).
  // The ancestor wins on every browser regardless of injection order.
  // Confirmed in Chromium on the docs home page tree
  // (apps/web/docs/demos/home/features.ts): the patched <small> renders
  // #707070 on #ededed = 4.23:1 with the ancestor's `color` present, and
  // #565656 on #ededed = 6.27:1 once it is removed.
  it("fires on the measured docs-home shape", () => {
    const element = {
      div: [
        { h3: "Title", $: [colorPatch] },
        { small: "Details", $: [colorPatch] },
      ],
      dataTone: "shift-1",
      style: {
        backgroundColor: (_l: unknown) => "var(--neutral-0)",
        color: (_l: unknown) => "var(--neutral-9)",
        "& h3": { marginTop: 0 },
        "& small": {
          display: "block",
          color: (_l: unknown) => "var(--neutral-8)",
        },
      },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  // The recommended fix: keep the selector, drop the colour.
  it("stays silent when the scoped block carries layout only", () => {
    const element = {
      div: [{ small: "Details", $: [colorPatch] }],
      style: {
        color: (_l: unknown) => "var(--neutral-9)",
        "& small": { display: "block" },
      },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  // No patch on the descendant means no guarantee to override — this is the
  // prose-container case (press's Markdown shell styles unpatched output).
  it("stays silent when the declared descendant carries no patch", () => {
    const element = {
      div: [{ small: "Details" }],
      style: {
        color: (_l: unknown) => "var(--neutral-9)",
        "& small": { color: (_l: unknown) => "var(--neutral-8)" },
      },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  // A patch that does not declare the property the block sets is not overridden.
  it("stays silent when the patch declares a different property", () => {
    const element = {
      div: [{ small: "Details", $: [colorPatch] }],
      style: {
        color: (_l: unknown) => "var(--neutral-9)",
        "& small": { backgroundColor: (_l: unknown) => "var(--neutral-2)" },
      },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  // A class selector is (0,2,0) and cannot be matched against the declared
  // tree; only a bare tag collides silently with a patch's host.
  it("stays silent for a class selector", () => {
    const element = {
      div: [{ small: "Details", $: [colorPatch] }],
      style: {
        color: (_l: unknown) => "var(--neutral-9)",
        "& .note": { color: (_l: unknown) => "var(--neutral-8)" },
      },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  it("fires for a direct-child selector too", () => {
    const element = {
      div: [{ p: "Body", $: [colorPatch] }],
      style: {
        color: (_l: unknown) => "var(--neutral-9)",
        "& > p": { color: (_l: unknown) => "var(--neutral-8)" },
      },
    };
    expect(rules(element)).toContain("descendant-color-override");
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

  it("uses the first own key as the tag, like core validate()", () => {
    // { dvi, div } — first own key is the typo. findTag must not skip past it
    // to the later valid "div"; core validate() rejects the first key.
    const issues = diagnose({ dvi: "typo", div: "ok" }).filter(
      (d) => d.rule === "unknown-tag",
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map((d) => d.message).join("\n")).toContain('"dvi"');
  });

  it("does not flag unknown-tag when the first own key is a valid tag", () => {
    expect(
      diagnose({ div: "ok", dvi: "attr" }).filter(
        (d) => d.rule === "unknown-tag",
      ),
    ).toEqual([]);
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

// Cases the "descendant-color-override narrowing" suite above does not cover.
// Same truth source: CSS Selectors Level 4 §17 (specificity) + CSS Cascade
// §6.4 — a descendant/child combinator adds a type selector, so `(0,1,1)`
// beats the single class `(0,1,0)` a patch styles its host with.
describe("descendant-color-override — combinator and boundary cases", () => {
  const colorPatch = {
    style: { color: (_l: unknown) => "var(--neutral-10)" },
  };

  it("stays silent for a pseudo-class block on the host itself (&:hover)", () => {
    const element = {
      div: [{ small: "x", $: [colorPatch] }],
      style: { "&:hover": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  it("honors the child combinator: `& > p` does not reach a grandchild", () => {
    const element = {
      div: [{ div: [{ p: "deep", $: [colorPatch] }] }],
      style: { "& > p": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  it("honors the descendant combinator: `& small` does reach a grandchild", () => {
    const element = {
      div: [{ div: [{ small: "deep", $: [colorPatch] }] }],
      style: { "& small": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  it("exempts reactive content, like the other declared-tree rules", () => {
    const element = {
      div: () => [{ small: "x", $: [colorPatch] }],
      style: { "& small": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  it("fires on backgroundColor as well as color", () => {
    const bgPatch = {
      style: { backgroundColor: (_l: unknown) => "var(--neutral-0)" },
    };
    const element = {
      div: [{ span: "x", $: [bgPatch] }],
      style: {
        "& span": { backgroundColor: (_l: unknown) => "var(--neutral-2)" },
      },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  it("follows composed patches (a patch whose own $ sets the color)", () => {
    const element = {
      div: [{ small: "x", $: [{ $: [colorPatch] }] }],
      style: { "& small": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  // A native `style.color` generates the identical per-node class (0,1,0) a
  // patch-supplied one does, so it is equally outranked by the ancestor's
  // (0,1,1) descendant selector — checking only `$`-patch declarations would
  // miss it.
  it("also fires on a native (non-patch) declared color", () => {
    const element = {
      div: [
        { small: "x", style: { color: (_l: unknown) => "var(--neutral-10)" } },
      ],
      style: { "& small": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  it("prefers the native value over the patch's when both are declared", () => {
    // core's own merge: native always wins over a patch default. The native
    // value here matches the ancestor block, so nothing is overridden even
    // though the patch's (unused) value would have differed.
    const element = {
      div: [
        {
          small: "x",
          style: { color: (_l: unknown) => "var(--neutral-8)" },
          $: [colorPatch],
        },
      ],
      style: { "& small": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  it("still ignores a pseudo-class and a compound-on-host selector", () => {
    const element = {
      div: [{ small: "x", $: [colorPatch] }],
      style: {
        // Transient state, not the resting color a patch guarantees — by
        // design, not a parsing gap.
        "& small:hover": { color: (_l: unknown) => "var(--neutral-8)" },
        // No combinator, no space: a compound selector on the HOST itself
        // ("&small" is never valid CSS, but the point stands for "&.foo" /
        // "&[x]" too), not a descendant selector.
        "&small": { color: (_l: unknown) => "var(--neutral-8)" },
      },
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });

  it("matches the universal selector `& > *` against every direct child", () => {
    const element = {
      div: [{ small: "x", $: [colorPatch] }],
      style: { "& > *": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  it("matches a class selector against a declared child's static `class`", () => {
    const element = {
      div: [{ small: "x", class: "caption", $: [colorPatch] }],
      style: { "& .caption": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  it("does not match a class selector against an unrelated class or a reactive class", () => {
    expect(
      rules({
        div: [{ small: "x", class: "other", $: [colorPatch] }],
        style: { "& .caption": { color: (_l: unknown) => "var(--neutral-8)" } },
      }),
    ).not.toContain("descendant-color-override");
    expect(
      rules({
        div: [
          { small: "x", class: (_l: unknown) => "caption", $: [colorPatch] },
        ],
        style: { "& .caption": { color: (_l: unknown) => "var(--neutral-8)" } },
      }),
    ).not.toContain("descendant-color-override");
  });

  it("matches an attribute-presence selector against a declared child's attribute", () => {
    const element = {
      div: [{ small: "x", "data-x": true, $: [colorPatch] }],
      style: { "& [data-x]": { color: (_l: unknown) => "var(--neutral-8)" } },
    };
    expect(rules(element)).toContain("descendant-color-override");
  });

  it("is suppressible with _doctorDisable on the host", () => {
    const element = {
      div: [{ small: "x", $: [colorPatch] }],
      style: { "& small": { color: (_l: unknown) => "var(--neutral-8)" } },
      _doctorDisable: "descendant-color-override",
    };
    expect(rules(element)).not.toContain("descendant-color-override");
  });
});

// Truth source: @domphy/core's own composition of `$` — `ElementNode`
// (helpers.ts `mergePartial` + `cloneDescriptor`) expands each patch, composes
// them left to right and merges the native element last so it wins. The real
// node's generated CSS/attributes is the oracle each case is held against: the
// doctor must see exactly what core renders, not a second guess at it.
describe("$ patch expansion — oracle: what core's ElementNode actually renders", () => {
  it("a style only a patch declares is analyzed, and core really renders it", () => {
    const patch = {
      style: {
        backgroundColor: (_l: unknown) => "var(--neutral-0)",
        color: (_l: unknown) => "var(--neutral-4)",
      },
    };
    const css = new ElementNode({ div: "x", $: [{ ...patch }] }).generateCSS();
    expect(css).toContain("background-color: var(--neutral-0)");
    expect(css).toContain("color: var(--neutral-4)");
    // Same pair (gap 4 < 9) the low-contrast rule flags when written inline.
    expect(rules({ div: "x", $: [patch] })).toContain("low-contrast");
  });

  it("a native value wins over the patch's, as core's merge does", () => {
    const patch = { style: { color: (_l: unknown) => "var(--neutral-4)" } };
    const css = new ElementNode({
      div: "x",
      $: [{ ...patch }],
      style: {
        backgroundColor: (_l: unknown) => "var(--neutral-0)",
        color: (_l: unknown) => "var(--neutral-11)",
      },
    }).generateCSS();
    expect(css).toContain("color: var(--neutral-11)");
    expect(css).not.toContain("color: var(--neutral-4)");
    expect(
      rules({
        div: "x",
        $: [patch],
        style: {
          backgroundColor: (_l: unknown) => "var(--neutral-0)",
          color: (_l: unknown) => "var(--neutral-11)",
        },
      }),
    ).not.toContain("low-contrast");
  });

  it("a patch-supplied attribute satisfies the rule that asks for it", () => {
    const patch = { role: "button", tabIndex: 0 };
    const node = new ElementNode({
      div: "Toggle",
      $: [{ ...patch }],
      onClick: () => {},
    });
    expect(node.generateHTML()).toContain('role="button"');
    expect(
      rules({ div: "Toggle", $: [patch], onClick: () => {} }),
    ).not.toContain("click-without-keyboard");
  });

  it("the host tag comes from the element, never from a patch", () => {
    // core reads getTagName(descriptor) BEFORE mergePartial, so a `span` key
    // inside a patch cannot re-tag a <div>.
    const node = new ElementNode({ div: "x", $: [{ span: "patch content" }] });
    expect(node.tagName).toBe("div");
    expect(rules({ div: null, $: [{ span: "patch content" }] })).not.toContain(
      "unknown-tag",
    );
  });

  it("union of `_doctorDisable`: a native entry never drops the patch's", () => {
    const element = {
      div: "x",
      // The patch owns the mid-ramp anchor; the element owns the dim opacity.
      $: [{ dataTone: "shift-6", _doctorDisable: "middle-surface-anchor" }],
      style: {
        opacity: 0.3,
        backgroundColor: (_l: unknown) => "var(--neutral-0)",
        color: (_l: unknown) => "var(--neutral-11)",
      },
      onClick: () => {},
      tabIndex: 0,
      _doctorDisable: "low-opacity",
    };
    const produced = rules(element);
    expect(produced).not.toContain("middle-surface-anchor");
    expect(produced).not.toContain("low-opacity");
    // Neither entry is stale, so nothing is reported as unused.
    expect(produced).not.toContain("unused-doctor-disable");
  });

  it("only the element's OWN disable entries can be reported stale", () => {
    const patchOnly = {
      div: "x",
      $: [{ _doctorDisable: "middle-surface-anchor" }],
    };
    expect(rules(patchOnly)).not.toContain("unused-doctor-disable");

    const ownToo = {
      div: "x",
      $: [{ _doctorDisable: "middle-surface-anchor" }],
      _doctorDisable: "low-opacity",
    };
    const diags = diagnose(ownToo).filter(
      (d) => d.rule === "unused-doctor-disable",
    );
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("low-opacity");
    expect(diags[0].message).not.toContain("middle-surface-anchor");
  });
});

// Truth source: CSS Color Module Level 5 §3 — `color-mix()` computes its result
// FROM its <color> arguments and contributes no color of its own, and its first
// argument is the colorspace (`in srgb`, `in oklch longer hue`), never a color.
// So a mix of nothing but theme tokens resolves through the theme at paint time
// exactly as themeColor() does, while a literal anywhere inside it does not.
describe("raw-theme-value and color-mix() — CSS Color Module Level 5 §3", () => {
  const flags = (value: string) =>
    rules({ div: "x", style: { backgroundColor: value } });

  it("a mix of theme tokens only is not a raw value", () => {
    expect(
      flags("color-mix(in srgb, var(--primary-9) 55%, var(--neutral-3))"),
    ).not.toContain("raw-theme-value");
  });

  it("the colorspace argument is never read as a color", () => {
    expect(
      flags("color-mix(in oklch longer hue, var(--a) 40%, var(--b))"),
    ).not.toContain("raw-theme-value");
  });

  it("transparent and currentColor carry no theme meaning", () => {
    expect(
      flags("color-mix(in srgb, var(--primary-9) 12%, transparent)"),
    ).not.toContain("raw-theme-value");
    expect(
      flags("color-mix(in srgb, currentColor 50%, transparent)"),
    ).not.toContain("raw-theme-value");
  });

  it("a hex, a named color or a channel function inside the mix is raw", () => {
    expect(flags("color-mix(in srgb, var(--a) 50%, #fff)")).toContain(
      "raw-theme-value",
    );
    expect(flags("color-mix(in srgb, red 50%, var(--a))")).toContain(
      "raw-theme-value",
    );
    expect(flags("color-mix(in srgb, rgb(1 2 3) 50%, var(--a))")).toContain(
      "raw-theme-value",
    );
  });

  it("follows a nested mix and a second mix later in the value", () => {
    expect(
      flags(
        "color-mix(in srgb, color-mix(in srgb, var(--a) 50%, transparent) 50%, var(--b))",
      ),
    ).not.toContain("raw-theme-value");
    expect(
      flags(
        "color-mix(in srgb, color-mix(in srgb, #fff 50%, transparent) 50%, var(--b))",
      ),
    ).toContain("raw-theme-value");
    expect(
      flags(
        "linear-gradient(color-mix(in srgb, var(--a) 50%, transparent), color-mix(in srgb, navy 50%, transparent))",
      ),
    ).toContain("raw-theme-value");
  });

  it("a mix inside a reactive value is resolved and checked", () => {
    expect(
      rules({
        div: "x",
        style: {
          borderColor: (_l: unknown) =>
            "color-mix(in srgb, var(--primary-9) 55%, var(--neutral-3))",
        },
      }),
    ).not.toContain("raw-theme-value");
  });
});

// Truth source: core's own selector join, `StyleList.getSelector`
// (packages/core/src/classes/StyleList.ts:30) — a key starting with `&` is
// CONCATENATED onto the element's selector, anything else is joined with a
// space. A block that reaches descendants styles markup this element does not
// construct (a Markdown/rawHtml render, a caller's children), and `$` attaches
// to one element, never a subtree — so there is no call site for the patch
// inline-typography prescribes.
describe("inline-typography scope — core StyleList.getSelector's & vs descendant join", () => {
  const literal = { fontSize: "13px", fontWeight: "700" };

  it("flags the element's own declaration", () => {
    expect(rules({ div: "x", style: { ...literal } })).toContain(
      "inline-typography",
    );
  });

  it("flags a compound on the element itself (& concatenates)", () => {
    for (const selector of ["&:hover", "&[disabled]", "&.active"]) {
      expect(
        rules({ div: "x", style: { [selector]: { ...literal } } }),
        selector,
      ).toContain("inline-typography");
    }
  });

  // `&::after` concatenates onto the element's own selector (same as
  // `&:hover`), but a pseudo-element is its OWN generated box — there is no
  // separate DOM element a `$` patch could attach to, so it is exempt exactly
  // like a descendant block, not flagged like `&:hover`.
  it("does not flag a pseudo-element, even though it concatenates like &:hover", () => {
    expect(
      rules({ div: "x", style: { "&::after": { ...literal } } }),
    ).not.toContain("inline-typography");
  });

  it("does not flag a block that reaches descendants with no matching declared child", () => {
    for (const selector of [
      "& h1",
      "& > p",
      "& a[target='_blank']::after",
      "& :not(pre)>code",
      "&+ div",
    ]) {
      expect(
        rules({ div: "x", style: { [selector]: { ...literal } } }),
        selector,
      ).not.toContain("inline-typography");
    }
  });

  // The exemption above only holds when there is no call site to move the
  // declaration to. When the descendant selector matches an element this
  // same tree actually declares, there IS one — the child itself — so the
  // rule fires and the hint points there instead of staying silent.
  it("flags a descendant block when a matching declared child exists", () => {
    expect(
      rules({
        div: [{ h1: "x" }],
        style: { "& h1": { ...literal } },
      }),
    ).toContain("inline-typography");
  });

  it("does not flag a descendant block when the matching child is behind a reactive boundary", () => {
    // Reactive content is one sample of many possible trees, not a
    // declaration — same boundary every other declared-tree rule observes.
    expect(
      rules({
        div: () => [{ h1: "x" }],
        style: { "& h1": { ...literal } },
      }),
    ).not.toContain("inline-typography");
  });

  it("a selector list is a descendant block as soon as one part reaches out", () => {
    expect(
      rules({ div: "x", style: { "&:hover, & h1": { ...literal } } }),
    ).not.toContain("inline-typography");
  });

  it("still runs the theme rules inside a descendant block", () => {
    const produced = rules({
      div: "x",
      style: {
        "& h1": { fontSize: "13px", color: "#abcdef", padding: "12px" },
      },
    });
    expect(produced).not.toContain("inline-typography");
    expect(produced).toContain("raw-theme-value");
    expect(produced).toContain("raw-spacing-value");
  });
});

// Truth source: @domphy/theme's own tone arithmetic, queried through its
// exported `resolveToneStep({ surface, tone })` — the same function the runtime
// paints from. Every themeColor() tone is RELATIVE to the surrounding tone
// context, so a rule that reads a resolved `var(--family-N)` is reading a
// number the browser never paints unless it resolves at the element's real
// surface. The expected values below are computed from the theme, never
// hand-written.
describe("tone-context resolution — oracle: @domphy/theme resolveToneStep", () => {
  const surface = "shift-17";
  const surfaceStep = resolveToneStep({ surface, tone: "inherit" });
  const textStep = resolveToneStep({ surface, tone: "shift-9" });

  it("the surface really does move the step (otherwise these tests prove nothing)", () => {
    expect(textStep).not.toBe(resolveToneStep({ tone: "shift-9" }));
    expect(Math.abs(surfaceStep - textStep)).toBeGreaterThanOrEqual(
      CONTRAST_SPAN,
    );
  });

  it("low-contrast does not fire on a pair that clears the span at its own surface", () => {
    const produced = rules({
      div: "x",
      dataTone: surface,
      style: {
        backgroundColor: (l: unknown) => themeColor(l as never, "inherit"),
        color: (l: unknown) => themeColor(l as never, "shift-9"),
      },
    });
    expect(produced).not.toContain("low-contrast");
    expect(produced).not.toContain("color-shift-minimum");
  });

  it("low-contrast still fires when the pair really is too close at that surface", () => {
    const closeStep = resolveToneStep({ surface, tone: "shift-2" });
    expect(Math.abs(surfaceStep - closeStep)).toBeLessThan(CONTRAST_SPAN);
    expect(
      rules({
        div: "x",
        dataTone: surface,
        style: {
          backgroundColor: (l: unknown) => themeColor(l as never, "inherit"),
          color: (l: unknown) => themeColor(l as never, "shift-2"),
        },
      }),
    ).toContain("low-contrast");
  });

  it("an ancestor's dataTone is the surface for its descendants", () => {
    // The child declares no dataTone of its own: it paints on the ancestor's
    // surface, so its tones must resolve there.
    const produced = rules({
      div: [
        {
          span: "x",
          style: {
            backgroundColor: (l: unknown) => themeColor(l as never, "inherit"),
            color: (l: unknown) => themeColor(l as never, "shift-9"),
          },
        },
      ],
      dataTone: surface,
      style: {
        backgroundColor: (l: unknown) => themeColor(l as never, "inherit"),
        color: (l: unknown) => themeColor(l as never, "shift-9"),
      },
    });
    expect(produced).not.toContain("low-contrast");
  });

  it("color-shift-minimum measures the gap to the surface, not an absolute step", () => {
    // On this surface `shift-9` resolves BELOW 9 and is still legible; the old
    // absolute `step < 9` test reported it.
    expect(textStep).toBeLessThan(CONTRAST_SPAN);
    expect(
      rules({
        div: "x",
        dataTone: surface,
        style: {
          backgroundColor: (_l: unknown) =>
            "linear-gradient(var(--neutral-16), var(--neutral-17))",
          color: (l: unknown) => themeColor(l as never, "shift-9"),
        },
      }),
    ).not.toContain("color-shift-minimum");
  });

  it("color-shift-minimum defers to low-contrast on the same pair", () => {
    // Both would measure text-vs-surface here; only one diagnostic is emitted.
    const produced = rules({
      div: "x",
      dataTone: "shift-0",
      style: {
        backgroundColor: (l: unknown) => themeColor(l as never, "inherit"),
        color: (l: unknown) => themeColor(l as never, "shift-4"),
      },
    });
    expect(produced).toContain("low-contrast");
    expect(produced).not.toContain("color-shift-minimum");
  });

  it("tone-background-inherit keeps probing at context 0 (it asks a different question)", () => {
    // The rule asks "is this a FIXED tone rather than inherit?", which is only
    // decidable at the unshifted context — a surface-resolved `inherit` is a
    // non-zero var too.
    expect(
      rules({
        div: "x",
        dataTone: "shift-17",
        style: {
          backgroundColor: (l: unknown) => themeColor(l as never, "inherit"),
          color: (l: unknown) => themeColor(l as never, "shift-9"),
        },
      }),
    ).not.toContain("tone-background-inherit");
    expect(
      rules({
        div: "x",
        dataTone: "shift-17",
        style: {
          backgroundColor: (l: unknown) => themeColor(l as never, "shift-3"),
          color: (l: unknown) => themeColor(l as never, "shift-9"),
        },
      }),
    ).toContain("tone-background-inherit");
  });

  it("a probe listener releases the subscriptions it picks up", () => {
    // `state.get(listener)` adds the listener to a Set the State's Notifier
    // owns (core Notifier.addListener), so a resolution pass that hands over a
    // fresh function must take it back out — otherwise every module-level
    // State accumulates one listener per diagnose() call, for the life of the
    // process.
    const color = toState("neutral", "probeColor");
    const listeners = (
      color as unknown as {
        _notifier: { _listeners: Record<string, Set<unknown>> };
      }
    )._notifier._listeners;
    const size = () => listeners.probeColor?.size ?? 0;
    const before = size();
    for (let index = 0; index < 50; index++) {
      diagnose({
        div: "x",
        style: {
          color: (l: unknown) =>
            themeColor(l as never, "shift-9", color.get(l as never)),
        },
      });
    }
    expect(size()).toBe(before);
  });
});

// Truth source: CSS itself. A reactive `(listener) => value` is a WRAPPER, not
// a different kind of declaration — `fontWeight: 500` and `fontWeight: () => 500`
// produce the identical CSS, and `var(--x)` is a theme reference whichever way
// it is written. And core's StyleList re-runs addCSS with the same parent
// selector for @media/@container/@supports/@layer (StyleList.ts:41), so a
// declaration inside one is this element's own style under a condition.
describe("inline-typography — static and reactive forms produce the same CSS", () => {
  const flags = (style: Record<string, unknown>) => rules({ div: "x", style });

  it("a var() reference is theme-driven in both forms", () => {
    const value = "var(--dp-font-mono, ui-monospace, monospace)";
    expect(flags({ fontFamily: value })).not.toContain("inline-typography");
    expect(flags({ fontFamily: () => value })).not.toContain(
      "inline-typography",
    );
  });

  it("a calc() is computed in both forms", () => {
    expect(flags({ fontSize: "calc(1em + 2px)" })).not.toContain(
      "inline-typography",
    );
    expect(flags({ fontSize: () => "calc(1em + 2px)" })).not.toContain(
      "inline-typography",
    );
  });

  it("a literal is a literal in both forms", () => {
    expect(flags({ fontSize: "16px" })).toContain("inline-typography");
    expect(flags({ fontSize: () => "16px" })).toContain("inline-typography");
  });

  it("a NUMBER is checked, reactive or not", () => {
    expect(flags({ fontWeight: 500 })).toContain("inline-typography");
    expect(flags({ fontWeight: () => 500 })).toContain("inline-typography");
    expect(flags({ fontWeight: "500" })).toContain("inline-typography");
    expect(flags({ fontWeight: () => "500" })).toContain("inline-typography");
  });

  it("unitless lineHeight stays exempt in every form", () => {
    for (const value of [1.5, "1.5", () => 1.5, () => "1.5"]) {
      expect(flags({ lineHeight: value }), String(value)).not.toContain(
        "inline-typography",
      );
    }
  });

  it("cascade keywords stay exempt in every form", () => {
    expect(flags({ textDecoration: "none" })).not.toContain(
      "inline-typography",
    );
    expect(flags({ textDecoration: () => "none" })).not.toContain(
      "inline-typography",
    );
    expect(flags({ fontSize: "inherit" })).not.toContain("inline-typography");
  });

  it("a reactive value is left alone when runReactive is off", () => {
    expect(
      diagnose(
        { div: "x", style: { fontWeight: () => 500 } },
        { runReactive: false },
      ).map((d) => d.rule),
    ).not.toContain("inline-typography");
  });
});

describe("nested style blocks — conditional at-rules are this element's style", () => {
  const literal = { fontSize: "13px", padding: "12px", color: "#abcdef" };

  it("walks @media, @container, @supports and @layer", () => {
    for (const at of [
      "@media (max-width: 768px)",
      "@container (min-width: 20em)",
      "@supports (display: grid)",
      "@layer components",
    ]) {
      const produced = rules({ div: "x", style: { [at]: { ...literal } } });
      expect(produced, at).toContain("inline-typography");
      expect(produced, at).toContain("raw-spacing-value");
      expect(produced, at).toContain("raw-theme-value");
    }
  });

  it("reports at the at-rule's own path", () => {
    const at = "@media (max-width: 768px)";
    const diags = diagnose({ div: "x", style: { [at]: { fontSize: "13px" } } });
    expect(diags[0].path).toBe(`div[${at}]`);
  });

  it("does NOT walk @font-face", () => {
    // @font-face declares fontFamily/fontWeight FOR the font it is defining —
    // that is the at-rule's required syntax, not the element's typography.
    expect(
      rules({
        div: "x",
        style: { "@font-face": { fontFamily: "Inter", fontWeight: "700" } },
      }),
    ).not.toContain("inline-typography");
  });

  // Truth source: the CSS @keyframes spec (CSS Animations §4) — a keyframe
  // rule's `from`/`to`/percentage stops declare states an animation passes
  // through, never the element's own resting style, so fontSize/fontWeight
  // inside one is never "inline typography" no matter how the stop key is
  // spelled. This does not exercise a keyframes-specific code path (there
  // isn't an observable one — see CONDITIONAL_AT_RULE's doc comment): a stop
  // key is never a "& …" selector or a media/container/supports/layer
  // at-rule, so it is skipped by the same general filter every other
  // non-selector key is. What this pins is the end-to-end behavior, which a
  // future change to that filter could still break.
  it("never flags a property inside an @keyframes stop", () => {
    for (const stopKey of ["0%", "50%", "100%", "from", "to"]) {
      expect(
        rules({
          div: "x",
          style: {
            "@keyframes spin": { [stopKey]: { fontSize: "13px" } },
          },
        }),
        stopKey,
      ).not.toContain("inline-typography");
    }
  });

  it("a descendant target inside a condition stays a descendant block", () => {
    const produced = rules({
      div: "x",
      style: {
        "@media (max-width: 768px)": { "& h1": { fontSize: "30px" } },
      },
    });
    expect(produced).not.toContain("inline-typography");
  });

  it("a condition inside a selector block is walked too", () => {
    expect(
      rules({
        div: "x",
        style: {
          "&:hover": { "@media (max-width: 768px)": { fontSize: "13px" } },
        },
      }),
    ).toContain("inline-typography");
  });
});

// Truth source: @domphy/theme's own typography helpers. Each returns a
// `var(--…)` reference, so the values the doctor tells an author to write must
// be values the doctor accepts — and the hint must name the vocabulary those
// helpers actually accept, since an invented name throws at the theme.
describe("inline-typography hint points at the theme's typography tokens", () => {
  it("accepts what it prescribes: themeWeight / themeLetterSpacing / themeFont", () => {
    expect(
      rules({
        p: "x",
        style: {
          fontWeight: themeWeight("semibold"),
          letterSpacing: themeLetterSpacing("tight"),
          fontFamily: themeFont("monospace"),
        },
      }),
    ).not.toContain("inline-typography");
  });

  it("names a real vocabulary for each property", () => {
    const hintFor = (prop: string, value: unknown) =>
      diagnose({ p: "x", style: { [prop]: value } }).find(
        (d) => d.rule === "inline-typography",
      )?.hint ?? "";

    const weightHint = hintFor("fontWeight", 500);
    expect(weightHint).toContain("themeWeight()");
    for (const name of FONT_WEIGHTS) expect(weightHint).toContain(`"${name}"`);

    const spacingHint = hintFor("letterSpacing", "-0.02em");
    expect(spacingHint).toContain("themeLetterSpacing()");
    for (const name of LETTER_SPACINGS)
      expect(spacingHint).toContain(`"${name}"`);

    const familyHint = hintFor("fontFamily", "Arial, sans-serif");
    expect(familyHint).toContain("themeFont(");
    for (const name of FONT_FAMILIES) expect(familyHint).toContain(`"${name}"`);
  });

  it("every flagged property carries a hint", () => {
    for (const [prop, value] of [
      ["fontSize", "16px"],
      ["lineHeight", "24px"],
      ["fontWeight", 500],
      ["letterSpacing", "-0.02em"],
      ["fontFamily", "Arial"],
      ["textDecoration", "dotted underline"],
    ] as const) {
      const diagnostic = diagnose({ p: "x", style: { [prop]: value } }).find(
        (d) => d.rule === "inline-typography",
      );
      expect(diagnostic, prop).toBeDefined();
      expect(diagnostic?.hint, prop).toBeTruthy();
    }
  });
});
