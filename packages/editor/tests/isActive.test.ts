import { describe, expect, it } from "vitest";

import { block, createTestEditor, docOf, h, p } from "./fixtures.js";

function marked(text: string, ...types: string[]) {
  return { type: "text", text, marks: types.map((type) => ({ type })) };
}

describe("isActive for marks", () => {
  it("uses the marks at the cursor for an empty selection", () => {
    const editor = createTestEditor(docOf(p(marked("bold", "bold"), "plain")));
    editor.commands.setTextSelection(3);
    expect(editor.isActive("bold")).toBe(true);
    editor.commands.setTextSelection(9);
    expect(editor.isActive("bold")).toBe(false);
  });

  it("prefers stored marks over the document at the cursor", () => {
    const editor = createTestEditor(docOf(p("plain")));
    editor.commands.setTextSelection(3);
    expect(editor.isActive("bold")).toBe(false);
    editor.commands.setMark("bold");
    expect(editor.isActive("bold")).toBe(true);
  });

  it("requires full coverage over a range", () => {
    const editor = createTestEditor(docOf(p(marked("ab", "bold"), "cd")));
    editor.commands.setTextSelection({ from: 1, to: 3 });
    expect(editor.isActive("bold")).toBe(true);
    // partially bold selection is not active
    editor.commands.setTextSelection({ from: 1, to: 5 });
    expect(editor.isActive("bold")).toBe(false);
  });

  it("matches mark attributes as a subset", () => {
    const editor = createTestEditor(
      docOf(
        p({
          type: "text",
          text: "x",
          marks: [{ type: "link", attrs: { href: "/a", target: "_blank" } }],
        }),
      ),
    );
    editor.commands.setTextSelection({ from: 1, to: 2 });
    expect(editor.isActive("link")).toBe(true);
    expect(editor.isActive("link", { href: "/a" })).toBe(true);
    expect(editor.isActive("link", { href: "/b" })).toBe(false);
  });
});

describe("isActive for nodes", () => {
  it("matches any node of the type on an empty selection", () => {
    const editor = createTestEditor(docOf(h(2, "Title")));
    editor.commands.setTextSelection(3);
    expect(editor.isActive("heading")).toBe(true);
    expect(editor.isActive("paragraph")).toBe(false);
  });

  it("treats attributes as a subset test", () => {
    const editor = createTestEditor(docOf(h(2, "Title")));
    editor.commands.setTextSelection(3);
    expect(editor.isActive("heading", { level: 2 })).toBe(true);
    expect(editor.isActive("heading", { level: 3 })).toBe(false);
  });

  it("matches ancestors of the cursor", () => {
    const editor = createTestEditor(
      docOf(block("blockquote", undefined, [p("x")])),
    );
    editor.commands.setTextSelection(3);
    expect(editor.isActive("blockquote")).toBe(true);
  });

  it("requires coverage over a range", () => {
    const editor = createTestEditor(docOf(h(2, "ab"), p("cd")));
    // whole first heading only
    editor.commands.setTextSelection({ from: 1, to: 3 });
    expect(editor.isActive("heading")).toBe(true);
    // spanning heading and paragraph
    editor.commands.setTextSelection({ from: 1, to: 7 });
    expect(editor.isActive("heading")).toBe(false);
  });

  it("returns false for unknown names", () => {
    const editor = createTestEditor(docOf(p("x")));
    expect(editor.isActive("nope")).toBe(false);
  });

  it("accepts the attributes-only overload", () => {
    const editor = createTestEditor(docOf(h(3, "Title")));
    editor.commands.setTextSelection(3);
    expect(editor.isActive({ level: 3 })).toBe(true);
  });
});

describe("getAttributes", () => {
  it("returns node attributes", () => {
    const editor = createTestEditor(docOf(h(3, "Title")));
    editor.commands.setTextSelection(3);
    expect(editor.getAttributes("heading")).toEqual({ level: 3 });
  });

  it("returns mark attributes", () => {
    const editor = createTestEditor(
      docOf(
        p({
          type: "text",
          text: "x",
          marks: [{ type: "link", attrs: { href: "/a", target: null } }],
        }),
      ),
    );
    editor.commands.setTextSelection({ from: 1, to: 2 });
    expect(editor.getAttributes("link")).toEqual({ href: "/a", target: null });
  });
});
