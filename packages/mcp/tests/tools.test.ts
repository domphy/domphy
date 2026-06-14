import { afterEach, describe, expect, it, vi } from "vitest";
import { diagnoseTree, getPatch, listPatches } from "../src/tools";

const manifest = {
  version: "0.9.0",
  packages: [],
  patches: [
    {
      name: "button",
      hostTag: "button",
      signature: "button(props: { color?: ThemeColor } = {})",
      doc: "",
      source: "packages/ui/src/patches/button.ts",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("diagnoseTree (no network)", () => {
  it("reports issues in a JSON element tree", () => {
    const out = diagnoseTree(JSON.stringify({ input: "oops" }));
    expect(out).toContain("void-content");
  });
  it("is clean for valid trees", () => {
    expect(diagnoseTree(JSON.stringify({ div: "hi" }))).toBe(
      "✓ No issues found.",
    );
  });
  it("handles invalid JSON", () => {
    expect(diagnoseTree("{not json")).toContain("Invalid JSON");
  });
});

describe("manifest-backed tools", () => {
  it("lists and gets patches from the fetched manifest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => manifest,
      })),
    );
    expect(await listPatches()).toContain("button <button>");
    expect(await getPatch("button")).toContain('"hostTag": "button"');
    expect(await getPatch("nope")).toContain("No patch named");
  });
});
