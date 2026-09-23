import { ElementNode } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { auditOutput } from "../src/layer4.js";

// Truth source: stylelint's `declaration-no-important` contract (it flags every
// `!important` declaration) held against the one declaration the USER does not
// own — `[hidden] { display: none !important; }`, which
// `ElementNode.generateCSS()` prepends to every root's stylesheet and whose
// `!important` is load-bearing (see packages/core/src/classes/ElementNode.ts).
// Reporting it made the rule fire on every audited tree with no possible fix,
// and turning the rule off would have hidden the user's own `!important` too.
describe("Layer 4 and the framework-owned base rule", () => {
  it("does not report the framework's [hidden] !important", async () => {
    const node = new ElementNode({ div: "hello", style: { padding: "1px" } });
    expect(node.generateCSS()).toContain("[hidden] { display: none !important");
    const diags = await auditOutput(node, { path: "framework" });
    expect(diags.map((d) => d.rule)).not.toContain(
      "css/declaration-no-important",
    );
    // stylelint's first load in a worker is slow; the CLI tests use the same
    // allowance.
  }, 30000);

  it("still reports an !important the user wrote", async () => {
    const node = new ElementNode({
      div: "hello",
      style: { color: "var(--neutral-9) !important" },
    });
    const diags = await auditOutput(node, { path: "user" });
    expect(diags.map((d) => d.rule)).toContain("css/declaration-no-important");
  }, 30000);

  it("keeps stylelint positions pointing at the real CSS offset", async () => {
    const node = new ElementNode({ div: "hello", style: { padding: "0px" } });
    const css = node.generateCSS();
    const diags = await auditOutput(node, { path: "offsets" });
    const zeroUnit = diags.find((d) => d.rule === "css/length-zero-no-unit");
    expect(zeroUnit).toBeDefined();
    const column = Number(
      /\[css:1:(\d+)\]/.exec(zeroUnit?.path ?? "")?.[1] ?? "0",
    );
    // Blanking the prefix instead of slicing it off keeps the offset addressing
    // the same CSS the caller sees: the warning lands inside the user's own
    // rule, well past the framework prefix, and the declaration is right there.
    expect(column - 1).toBeGreaterThan(css.indexOf(".div"));
    expect(css.slice(column - 20, column + 20)).toContain("0px");
  }, 30000);
});

// Truth source: the HTML accessible-name-computation algorithm WCAG 4.1.2
// requires (https://www.w3.org/TR/accname/) — aria-label, aria-labelledby,
// a wrapping <label>, and title (in that precedence order) all give an
// input an accessible name, not only `<label for>`. htmlhint's vendored
// `input-requires-label` rule only implements the `for` case (verified by
// reading packages/doctor/node_modules/htmlhint/dist/core/rules/input-requires-label.js),
// so every input using one of the other three was a false positive.
describe("Layer 4 input-requires-label false positives", () => {
  it("does not flag an input with aria-label", async () => {
    const node = new ElementNode({
      div: [{ input: null, "aria-label": "Email" }],
    } as any);
    const diags = await auditOutput(node, { path: "aria-label" });
    expect(diags.map((d) => d.rule)).not.toContain("html/input-requires-label");
  }, 30000);

  it("does not flag an input with aria-labelledby", async () => {
    const node = new ElementNode({
      div: [
        { span: "Email", id: "email-label" },
        { input: null, "aria-labelledby": "email-label" },
      ],
    } as any);
    const diags = await auditOutput(node, { path: "aria-labelledby" });
    expect(diags.map((d) => d.rule)).not.toContain("html/input-requires-label");
  }, 30000);

  it("does not flag an input with a title", async () => {
    const node = new ElementNode({
      div: [{ input: null, title: "Email" }],
    } as any);
    const diags = await auditOutput(node, { path: "title" });
    expect(diags.map((d) => d.rule)).not.toContain("html/input-requires-label");
  }, 30000);

  it("does not flag an input implicitly wrapped by a <label>", async () => {
    const node = new ElementNode({
      label: ["Email", { input: null }],
    } as any);
    const diags = await auditOutput(node, { path: "wrapping-label" });
    expect(diags.map((d) => d.rule)).not.toContain("html/input-requires-label");
  }, 30000);

  it("still flags an input with no accessible name at all", async () => {
    const node = new ElementNode({
      div: [{ input: null }],
    } as any);
    const diags = await auditOutput(node, { path: "no-label" });
    expect(diags.map((d) => d.rule)).toContain("html/input-requires-label");
  }, 30000);

  it("still flags a second, genuinely unlabeled input after a labeled one", async () => {
    // Regression check for the forward-only search cursor: two inputs, only
    // the first has an accessible name — the second must still be flagged.
    const node = new ElementNode({
      div: [{ input: null, "aria-label": "Email" }, { input: null }],
    } as any);
    const diags = await auditOutput(node, { path: "mixed" });
    expect(
      diags.filter((d) => d.rule === "html/input-requires-label"),
    ).toHaveLength(1);
  }, 30000);
});
