// @vitest-environment node
import { describe, expect, it } from "vitest";

import { generateHTML, parseHTML } from "../src/serialize/html.js";
import { block, createTestEditor, docOf, h, p } from "./fixtures.js";

describe("SSR (no DOM available)", () => {
  it("has no document global", () => {
    expect(typeof document).toBe("undefined");
  });

  it("creates an editor and renders HTML from JSON", () => {
    const editor = createTestEditor(docOf(h(1, "Title"), p("body")));
    expect(editor.getHTML()).toBe("<h1>Title</h1><p>body</p>");
    expect(editor.getText()).toBe("Title\n\nbody");
    // level 1 is the default, so the attrs bag is omitted entirely
    expect(editor.getJSON()).toEqual(
      docOf(block("heading", undefined, ["Title"]), p("body")),
    );
  });

  it("runs commands without a view", () => {
    const editor = createTestEditor(docOf(p("hello")));
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(editor.commands.setMark("bold")).toBe(true);
    expect(editor.getHTML()).toBe("<p><strong>hello</strong></p>");
  });

  it("explains that HTML input needs a DOM", () => {
    const editor = createTestEditor();
    expect(() => generateHTML(editor.schema, editor.state.doc)).not.toThrow();
    expect(() => parseHTML(editor.schema, "<p>x</p>")).toThrow(
      /requires a DOM environment/,
    );
  });
});
