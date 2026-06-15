import { describe, expect, it } from "vitest";
import { diagnose, format, validate } from "../src/index";

const rules = (tree: unknown, opts?: Parameters<typeof diagnose>[1]) =>
  diagnose(tree, opts).map((d) => d.rule);

describe("diagnose", () => {
  it("flags inline typography literals but not reactive ones", () => {
    expect(rules({ p: "hi", style: { fontSize: "20px" } })).toContain(
      "inline-typography",
    );
    // reactive (function) typography is allowed — theme drives it
    expect(rules({ p: "hi", style: { fontSize: () => "20px" } })).not.toContain(
      "inline-typography",
    );
    // non-typography style props are fine
    expect(rules({ div: "x", style: { display: "flex" } })).toEqual([]);
  });

  it("errors on void tags with content", () => {
    const d = diagnose({ input: "oops" });
    expect(d[0].rule).toBe("void-content");
    expect(d[0].severity).toBe("error");
    expect(diagnose({ input: null })).toEqual([]);
  });

  it("flags unknown/typo tags", () => {
    expect(rules({ dvi: "typo" })).toContain("unknown-tag");
    expect(rules({ div: "ok" })).toEqual([]);
  });

  it("flags missing _key only in dynamic lists", () => {
    // dynamic (reactive function) list without _key -> warn
    expect(rules({ ul: () => [{ li: "a" }, { li: "b" }] })).toContain(
      "missing-key",
    );
    // dynamic list WITH _key -> ok
    expect(
      rules({
        ul: () => [
          { li: "a", _key: 1 },
          { li: "b", _key: 2 },
        ],
      }),
    ).not.toContain("missing-key");
    // static array (not from a function) -> NOT flagged
    expect(rules({ div: [{ header: "h" }, { main: "m" }] })).not.toContain(
      "missing-key",
    );
  });

  it("errors on duplicate _key among siblings (static or dynamic)", () => {
    // static sibling array with a repeated key -> error
    const d = diagnose({
      div: [
        { li: "a", _key: "x" },
        { li: "b", _key: "x" },
      ],
    });
    expect(d.map((i) => i.rule)).toContain("duplicate-key");
    expect(d.find((i) => i.rule === "duplicate-key")?.severity).toBe("error");
    // distinct keys are fine
    expect(
      rules({
        div: [
          { li: "a", _key: "x" },
          { li: "b", _key: "y" },
        ],
      }),
    ).not.toContain("duplicate-key");
    // also fires inside a dynamic list
    expect(
      rules({
        ul: () => [
          { li: "a", _key: 1 },
          { li: "b", _key: 1 },
        ],
      }),
    ).toContain("duplicate-key");
  });

  it("warns on array-index _key in dynamic lists (unstable-key)", () => {
    // keys 0,1,2 matching position -> index keys
    expect(
      rules({
        ul: () => [
          { li: "a", _key: 0 },
          { li: "b", _key: 1 },
          { li: "c", _key: 2 },
        ],
      }),
    ).toContain("unstable-key");
    // stable ids -> not flagged
    expect(
      rules({
        ul: () => [
          { li: "a", _key: 101 },
          { li: "b", _key: 102 },
        ],
      }),
    ).not.toContain("unstable-key");
    // static index-like keys are NOT flagged (heuristic only bites dynamic lists)
    expect(
      rules({
        div: [
          { li: "a", _key: 0 },
          { li: "b", _key: 1 },
        ],
      }),
    ).not.toContain("unstable-key");
  });

  it("flags unknown dataTone words, allows valid tone grammar", () => {
    expect(rules({ div: "x", dataTone: "surface" })).toContain("unknown-tone");
    expect(rules({ div: "x", dataTone: "text" })).toContain("unknown-tone");
    expect(rules({ div: "x", dataTone: "shift-9" })).not.toContain(
      "unknown-tone",
    );
    expect(rules({ div: "x", dataTone: "increase-2" })).not.toContain(
      "unknown-tone",
    );
    expect(rules({ div: "x", dataTone: "base" })).not.toContain("unknown-tone");
    expect(rules({ div: "x", dataTone: "3" })).not.toContain("unknown-tone");
  });

  it("flags literal colors (raw-theme-value), not tokens or keywords", () => {
    expect(rules({ div: "x", style: { color: "#ff0000" } })).toContain(
      "raw-theme-value",
    );
    expect(
      rules({ div: "x", style: { backgroundColor: "rgb(0,0,0)" } }),
    ).toContain("raw-theme-value");
    expect(rules({ div: "x", style: { border: "1px solid #ccc" } })).toContain(
      "raw-theme-value",
    );
    // reactive (theme token) color is fine
    expect(rules({ div: "x", style: { color: () => "#fff" } })).not.toContain(
      "raw-theme-value",
    );
    // colorless keywords carry no theme meaning -> fine
    expect(
      rules({ div: "x", style: { backgroundColor: "transparent" } }),
    ).not.toContain("raw-theme-value");
    expect(rules({ div: "x", style: { color: "currentColor" } })).not.toContain(
      "raw-theme-value",
    );
  });

  it("respects runReactive: false", () => {
    expect(
      rules({ ul: () => [{ li: "a" }, { li: "b" }] }, { runReactive: false }),
    ).not.toContain("missing-key");
  });

  it("returns clean for idiomatic trees and formats nicely", () => {
    const clean = diagnose({
      div: [
        { h1: "Title" },
        {
          ul: () => [
            { li: "a", _key: 1 },
            { li: "b", _key: 2 },
          ],
        },
      ],
    });
    expect(clean).toEqual([]);
    expect(format(clean)).toBe("✓ No issues found.");

    const dirty = diagnose({ p: "x", style: { fontWeight: "700" } });
    expect(format(dirty)).toContain("inline-typography");
  });
});

describe("validate (aggregate report)", () => {
  it("is ok with empty summary for a clean tree", () => {
    const report = validate({ div: "hi" });
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.summary).toEqual({
      error: 0,
      warning: 0,
      info: 0,
      total: 0,
    });
  });

  it("is not ok and counts by severity when errors are present", () => {
    const report = validate({
      div: [
        { input: "oops" }, // void-content -> error
        { p: "x", style: { fontSize: "20px" } }, // inline-typography -> warning
      ],
    });
    expect(report.ok).toBe(false);
    expect(report.summary.error).toBeGreaterThanOrEqual(1);
    expect(report.summary.warning).toBeGreaterThanOrEqual(1);
    expect(report.summary.total).toBe(report.issues.length);
  });

  it("stays ok when only warnings/info are present", () => {
    const report = validate({ p: "x", style: { fontSize: "20px" } });
    expect(report.ok).toBe(true);
    expect(report.summary.warning).toBeGreaterThanOrEqual(1);
    expect(report.summary.error).toBe(0);
  });

  it("forwards options to diagnose", () => {
    const report = validate(
      { ul: () => [{ li: "a" }, { li: "b" }] },
      { runReactive: false },
    );
    expect(report.issues).toEqual([]);
  });
});
