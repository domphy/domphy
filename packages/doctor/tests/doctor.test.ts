import { describe, expect, it } from "vitest";
import { diagnose, format } from "../src/index";

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
