import { describe, expect, it } from "vitest";

import type { Command } from "../src/types.js";
import { createTestEditor, docOf, p } from "./fixtures.js";

const failing: Command = () => false;
const succeeding: Command = () => true;

describe("single commands", () => {
  it("dispatch immediately and return the command result", () => {
    const editor = createTestEditor(docOf(p("ab")));
    expect(editor.commands.command(succeeding)).toBe(true);
    expect(editor.commands.command(failing)).toBe(false);
  });

  it("each call gets a fresh transaction", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection(3);
    editor.commands.insertContent("c");
    editor.commands.insertContent("d");
    expect(editor.getJSON()).toEqual(docOf(p("abcd")));
  });
});

describe("chain", () => {
  it("shares one transaction across every link", () => {
    const editor = createTestEditor(docOf(p("ab")));
    let updates = 0;
    editor.on("update", () => {
      updates += 1;
    });
    const result = editor
      .chain()
      .setTextSelection(3)
      .insertContent("c")
      .insertContent("d")
      .run();
    expect(result).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("abcd")));
    expect(updates).toBe(1);
  });

  it("a failing link does not abort the chain but run() reports false", () => {
    const editor = createTestEditor(docOf(p("ab")));
    const calls: string[] = [];
    const result = editor
      .chain()
      .command(() => {
        calls.push("first");
        return false;
      })
      .command(({ tr }) => {
        calls.push("second");
        tr.insertText("!", 3, 3);
        return true;
      })
      .run();
    expect(calls).toEqual(["first", "second"]);
    expect(result).toBe(false);
    // the failing link did not roll anything back
    expect(editor.getJSON()).toEqual(docOf(p("ab!")));
  });

  it("does not dispatch until run()", () => {
    const editor = createTestEditor(docOf(p("ab")));
    const chain = editor.chain().setTextSelection(3).insertContent("c");
    expect(editor.getJSON()).toEqual(docOf(p("ab")));
    chain.run();
    expect(editor.getJSON()).toEqual(docOf(p("abc")));
  });
});

describe("can", () => {
  it("reports feasibility without changing the document", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection({ from: 1, to: 3 });
    expect(editor.can().setMark("bold")).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("ab")));
  });

  it("reports false for impossible commands", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection(2);
    expect(editor.can().setMark("unknownMark")).toBe(false);
    expect(editor.can().lift("blockquote")).toBe(false);
  });

  it("passes dispatch as undefined so commands stay pure", () => {
    const editor = createTestEditor(docOf(p("ab")));
    let seen: unknown = "unset";
    editor.can().command(({ dispatch }) => {
      seen = dispatch;
      return true;
    });
    expect(seen).toBeUndefined();
  });

  it("can().chain() never dispatches", () => {
    const editor = createTestEditor(docOf(p("ab")));
    const result = editor
      .can()
      .chain()
      .setTextSelection(3)
      .insertContent("c")
      .run();
    expect(result).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("ab")));
  });
});

describe("update events", () => {
  it("are not emitted when the document did not change", () => {
    const editor = createTestEditor(docOf(p("ab")));
    let updates = 0;
    editor.on("update", () => {
      updates += 1;
    });
    editor.commands.setTextSelection(2);
    expect(updates).toBe(0);
  });

  it("are suppressed by the preventUpdate meta", () => {
    const editor = createTestEditor(docOf(p("ab")));
    let updates = 0;
    editor.on("update", () => {
      updates += 1;
    });
    editor.chain().setMeta("preventUpdate", true).insertContentAt(3, "c").run();
    expect(editor.getJSON()).toEqual(docOf(p("abc")));
    expect(updates).toBe(0);
  });

  it("bump stateVersion for the Domphy reactivity bridge", () => {
    const editor = createTestEditor(docOf(p("ab")));
    const before = editor.stateVersion.get();
    editor.commands.insertContentAt(3, "c");
    expect(editor.stateVersion.get()).toBeGreaterThan(before);
  });
});
