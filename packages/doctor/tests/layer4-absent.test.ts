import { ElementNode } from "@domphy/core";
import { describe, expect, it, vi } from "vitest";
import { auditOutput } from "../src/layer4.js";

// Simulates the optional peer linters being absent: both module factories
// throw, so the dynamic import("htmlhint") / import("stylelint") calls inside
// layer4 reject the same way they would when the packages are not installed.
// auditOutput() must degrade to [] (per-linter) instead of crashing — this
// path was previously code-inspected only.
vi.mock("htmlhint", () => {
  throw new Error("Cannot find module 'htmlhint'");
});
vi.mock("stylelint", () => {
  throw new Error("Cannot find module 'stylelint'");
});

describe("auditOutput with htmlhint/stylelint absent", () => {
  it("returns [] gracefully instead of throwing", async () => {
    // An img without alt would normally produce html/alt-require — with the
    // linters absent the diagnostic silently disappears (documented behavior).
    const node = new ElementNode({ div: [{ img: null, src: "x.png" }] });
    const diags = await auditOutput(node, { path: "absent-peers" });
    expect(diags).toEqual([]);
  });
});
