import { describe, expect, it } from "vitest";
import { Blockquote } from "../../src/extensions/blockquote";
import { Bold } from "../../src/extensions/bold";
import { BulletList } from "../../src/extensions/bulletList";
import { Code } from "../../src/extensions/code";
import { CodeBlock } from "../../src/extensions/codeBlock";
import { Document } from "../../src/extensions/document";
import { HardBreak } from "../../src/extensions/hardBreak";
import { Heading } from "../../src/extensions/heading";
import { HorizontalRule } from "../../src/extensions/horizontalRule";
import { Italic } from "../../src/extensions/italic";
import { Link } from "../../src/extensions/link";
import { ListItem } from "../../src/extensions/listItem";
import { OrderedList } from "../../src/extensions/orderedList";
import { Paragraph } from "../../src/extensions/paragraph";
import { Strike } from "../../src/extensions/strike";
import { UndoRedo } from "../../src/extensions/undoRedo";
import { createRecorder, createTransaction, open } from "./harness";

describe("keyboard shortcut maps", () => {
  it("binds the keys tiptap binds", () => {
    expect(open(Paragraph).shortcutKeys()).toEqual(["Mod-Alt-0"]);
    expect(open(Heading).shortcutKeys()).toEqual([
      "Mod-Alt-1",
      "Mod-Alt-2",
      "Mod-Alt-3",
      "Mod-Alt-4",
      "Mod-Alt-5",
      "Mod-Alt-6",
    ]);
    expect(open(Bold).shortcutKeys()).toEqual(["Mod-b", "Mod-B"]);
    expect(open(Italic).shortcutKeys()).toEqual(["Mod-i", "Mod-I"]);
    expect(open(Strike).shortcutKeys()).toEqual(["Mod-Shift-s"]);
    expect(open(Code).shortcutKeys()).toEqual(["Mod-e"]);
    expect(open(Blockquote).shortcutKeys()).toEqual([
      "Mod-Shift-b",
      "Backspace",
    ]);
    expect(open(BulletList).shortcutKeys()).toEqual(["Mod-Shift-8"]);
    expect(open(OrderedList).shortcutKeys()).toEqual(["Mod-Shift-7"]);
    expect(open(ListItem).shortcutKeys()).toEqual([
      "Enter",
      "Tab",
      "Shift-Tab",
    ]);
    expect(open(HardBreak).shortcutKeys()).toEqual([
      "Mod-Enter",
      "Shift-Enter",
    ]);
    expect(open(CodeBlock).shortcutKeys()).toEqual([
      "Mod-Alt-c",
      "Backspace",
      "Enter",
    ]);
    expect(open(UndoRedo).shortcutKeys()).toEqual([
      "Mod-z",
      "Shift-Mod-z",
      "Mod-y",
    ]);
  });

  it("binds one heading shortcut per configured level", () => {
    expect(
      open(Heading, { options: { levels: [1, 2] } }).shortcutKeys(),
    ).toEqual(["Mod-Alt-1", "Mod-Alt-2"]);
  });

  it("leaves the schema-only extensions unbound", () => {
    expect(open(Document).shortcutKeys()).toEqual([]);
    expect(open(HorizontalRule).shortcutKeys()).toEqual([]);
    expect(open(Link).shortcutKeys()).toEqual([]);
  });
});

describe("shortcut delegation", () => {
  it("routes each key to its command", () => {
    const recorder = createRecorder();
    const invoke = (extension: ReturnType<typeof open>, key: string) =>
      extension.shortcuts()[key]({ editor: recorder.editor });

    invoke(open(Paragraph), "Mod-Alt-0");
    invoke(open(Heading), "Mod-Alt-2");
    invoke(open(Bold), "Mod-b");
    invoke(open(ListItem), "Tab");
    invoke(open(UndoRedo), "Mod-z");
    invoke(open(UndoRedo), "Mod-y");

    expect(recorder.calls).toEqual([
      { name: "setParagraph", args: [] },
      { name: "toggleHeading", args: [{ level: 2 }] },
      { name: "toggleBold", args: [] },
      { name: "sinkListItem", args: ["listItem"] },
      { name: "undo", args: [] },
      { name: "redo", args: [] },
    ]);
  });
});

describe("blockquote backspace", () => {
  const blockquote = open(Blockquote);

  it("lifts a block sitting at the start of a quote", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        position: {
          parentOffset: 0,
          depth: 2,
          node: (depth: number) =>
            depth === 1 ? { type: "blockquote" } : { type: "doc" },
        },
      }),
    });

    expect(blockquote.shortcuts().Backspace({ editor: recorder.editor })).toBe(
      true,
    );
    expect(recorder.names()).toEqual(["command", "lift"]);
  });

  it("does nothing away from the start of the block", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        position: {
          parentOffset: 4,
          depth: 2,
          node: () => ({ type: "blockquote" }),
        },
      }),
    });

    expect(blockquote.shortcuts().Backspace({ editor: recorder.editor })).toBe(
      false,
    );
    expect(recorder.names()).toEqual(["command"]);
  });

  it("does nothing outside a quote", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        position: { parentOffset: 0, depth: 1, node: () => ({ type: "doc" }) },
      }),
    });

    expect(blockquote.shortcuts().Backspace({ editor: recorder.editor })).toBe(
      false,
    );
    expect(recorder.names()).toEqual(["command"]);
  });
});

describe("codeBlock backspace and enter", () => {
  const codeBlock = open(CodeBlock);

  it("clears an empty code block", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        selection: { from: 5, to: 5, anchor: 5, head: 5, empty: true },
        position: { parent: { type: "codeBlock" } },
      }),
    });

    expect(codeBlock.shortcuts().Backspace({ editor: recorder.editor })).toBe(
      true,
    );
    expect(recorder.names()).toEqual(["command", "clearNodes"]);
  });

  it("keeps a code block that still has text", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        selection: { from: 5, to: 5, anchor: 5, head: 5, empty: true },
        position: {
          parent: {
            type: "codeBlock",
            content: [{ type: "text", text: "abc" }],
          },
        },
      }),
    });

    expect(codeBlock.shortcuts().Backspace({ editor: recorder.editor })).toBe(
      false,
    );
    expect(recorder.names()).toEqual(["command"]);
  });

  it("exits on a third Enter after two trailing newlines", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        selection: { from: 5, to: 5, anchor: 5, head: 5, empty: true },
        position: {
          parent: {
            type: "codeBlock",
            content: [{ type: "text", text: "a\n\n" }],
          },
          parentOffset: 3,
        },
      }),
    });

    expect(codeBlock.shortcuts().Enter({ editor: recorder.editor })).toBe(true);
    expect(recorder.calls).toEqual([
      { name: "command", args: [expect.any(Function)] },
      { name: "deleteRange", args: [{ from: 3, to: 5 }] },
      { name: "exitCode", args: [] },
    ]);
  });

  it("leaves Enter alone in the middle of a code block", () => {
    const recorder = createRecorder({
      transaction: createTransaction({
        selection: { from: 3, to: 3, anchor: 3, head: 3, empty: true },
        position: {
          parent: {
            type: "codeBlock",
            content: [{ type: "text", text: "abc" }],
          },
          parentOffset: 1,
        },
      }),
    });

    expect(codeBlock.shortcuts().Enter({ editor: recorder.editor })).toBe(
      false,
    );
  });
});
