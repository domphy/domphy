import { describe, expect, it, vi } from "vitest";
import type { HistoryEntry } from "../src/history.js";
import { History } from "../src/history.js";
import { createTestEditor, docOf, p } from "./fixtures.js";

function entry(text: string): HistoryEntry {
  return {
    doc: docOf(p(text)),
    selection: { anchor: 1, head: 1, from: 1, to: 1, empty: true },
    storedMarks: null,
  };
}

describe("History", () => {
  it("groups changes recorded within newGroupDelay", () => {
    const history = new History(100, 500);
    history.record(entry("a"), 1000);
    history.record(entry("b"), 1200);
    history.record(entry("c"), 1400);
    expect(history.undo(entry("d"))?.doc).toEqual(docOf(p("a")));
    expect(history.canUndo).toBe(false);
  });

  it("starts a new group past newGroupDelay", () => {
    const history = new History(100, 500);
    history.record(entry("a"), 1000);
    history.record(entry("b"), 2000);
    expect(history.undo(entry("c"))?.doc).toEqual(docOf(p("b")));
    expect(history.undo(entry("b"))?.doc).toEqual(docOf(p("a")));
  });

  it("caps the stack at the configured depth", () => {
    const history = new History(2, 0);
    history.record(entry("a"), 1000);
    history.record(entry("b"), 2000);
    history.record(entry("c"), 3000);
    expect(history.undo(entry("d"))?.doc).toEqual(docOf(p("c")));
    expect(history.undo(entry("c"))?.doc).toEqual(docOf(p("b")));
    expect(history.canUndo).toBe(false);
  });

  it("clears redo when a new change is recorded", () => {
    const history = new History(100, 0);
    history.record(entry("a"), 1000);
    history.undo(entry("b"));
    expect(history.canRedo).toBe(true);
    history.record(entry("c"), 2000);
    expect(history.canRedo).toBe(false);
  });
});

describe("undo / redo commands", () => {
  it("restore the previous document and selection", () => {
    vi.useFakeTimers();
    try {
      const editor = createTestEditor(docOf(p("ab")));
      editor.commands.setTextSelection(3);
      editor.commands.insertContent("c");
      expect(editor.getJSON()).toEqual(docOf(p("abc")));

      expect(editor.commands.undo()).toBe(true);
      expect(editor.getJSON()).toEqual(docOf(p("ab")));
      expect(editor.state.selection.from).toBe(3);

      expect(editor.commands.redo()).toBe(true);
      expect(editor.getJSON()).toEqual(docOf(p("abc")));
    } finally {
      vi.useRealTimers();
    }
  });

  it("report false when there is nothing to undo", () => {
    const editor = createTestEditor(docOf(p("ab")));
    expect(editor.commands.undo()).toBe(false);
    expect(editor.commands.redo()).toBe(false);
  });

  it("group consecutive inserts into one undo step", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(0));
      const editor = createTestEditor(docOf(p("")));
      editor.commands.setTextSelection(1);
      editor.commands.insertContent("a");
      vi.setSystemTime(new Date(100));
      editor.commands.insertContent("b");
      vi.setSystemTime(new Date(200));
      editor.commands.insertContent("c");
      expect(editor.getJSON()).toEqual(docOf(p("abc")));

      editor.commands.undo();
      expect(editor.getJSON()).toEqual(docOf(p()));
    } finally {
      vi.useRealTimers();
    }
  });

  it("start a new group after the delay elapses", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(0));
      const editor = createTestEditor(docOf(p("")));
      editor.commands.setTextSelection(1);
      editor.commands.insertContent("a");
      vi.setSystemTime(new Date(1000));
      editor.commands.insertContent("b");

      editor.commands.undo();
      expect(editor.getJSON()).toEqual(docOf(p("a")));
      editor.commands.undo();
      expect(editor.getJSON()).toEqual(docOf(p()));
    } finally {
      vi.useRealTimers();
    }
  });
});
