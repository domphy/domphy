import { describe, expect, it } from "vitest";
import { Editor } from "../../src/Editor";
import { Document } from "../../src/extensions/document";
import { Heading } from "../../src/extensions/heading";
import { HorizontalRule } from "../../src/extensions/horizontalRule";
import { Paragraph } from "../../src/extensions/paragraph";
import { Text } from "../../src/extensions/text";
import { TrailingNode } from "../../src/extensions/trailingNode";
import { endPosition } from "../../src/model/position";
import type { AnyExtension, Content } from "../../src/types";

function createEditor(content: Content, trailing: AnyExtension = TrailingNode) {
  return new Editor({
    content,
    extensions: [Document, Paragraph, Text, Heading, HorizontalRule, trailing],
  });
}

const typesOf = (editor: Editor) =>
  (editor.getJSON().content ?? []).map((node) => node.type);

/** Node type holding the last text position in the document. */
function lastTextblockType(editor: Editor): string | undefined {
  let type: string | undefined;

  editor.commands.command(({ tr }) => {
    type = tr.resolve(endPosition(editor.schema, tr.doc)).parent.type;
    return true;
  });

  return type;
}

/** Move the caret to the end of the document. */
function selectEnd(editor: Editor) {
  editor.commands.setTextSelection(
    endPosition(editor.schema, editor.state.doc),
  );
}

describe("trailingNode", () => {
  it("appends a paragraph after a rule inserted at the end", () => {
    const editor = createEditor("<p>keep</p>");

    selectEnd(editor);
    editor.commands.setHorizontalRule();

    expect(typesOf(editor)).toEqual([
      "paragraph",
      "horizontalRule",
      "paragraph",
    ]);
    editor.destroy();
  });

  it("leaves a text position after the trailing rule", () => {
    const editor = createEditor("<p>keep</p>");

    selectEnd(editor);
    editor.commands.setHorizontalRule();

    // Without the trailing node the last block is the rule, a leaf that holds
    // no text position — the caret trap this extension exists to prevent.
    expect(lastTextblockType(editor)).toBe("paragraph");
    editor.destroy();
  });

  it("appends on create when the initial content ends in a leaf", () => {
    const editor = createEditor("<p>intro</p><hr>");

    expect(typesOf(editor)).toEqual([
      "paragraph",
      "horizontalRule",
      "paragraph",
    ]);
    editor.destroy();
  });

  it("adds nothing when the document already ends in a paragraph", () => {
    const editor = createEditor("<p>done</p>");

    expect(typesOf(editor)).toEqual(["paragraph"]);
    editor.destroy();
  });

  it("respects notAfter", () => {
    const editor = createEditor(
      "<h1>title</h1>",
      TrailingNode.configure({ notAfter: ["heading"] }),
    );

    expect(typesOf(editor)).toEqual(["heading"]);
    editor.destroy();
  });

  it("appends after a heading when notAfter does not cover it", () => {
    const editor = createEditor("<h1>title</h1>");

    expect(typesOf(editor)).toEqual(["heading", "paragraph"]);
    editor.destroy();
  });

  it("settles after one append instead of looping", () => {
    let updates = 0;
    const editor = new Editor({
      content: "<p>intro</p><hr>",
      extensions: [Document, Paragraph, Text, HorizontalRule, TrailingNode],
      onUpdate: () => {
        updates += 1;
      },
    });

    // The append on create is the only document change.
    expect(updates).toBe(1);

    updates = 0;
    selectEnd(editor);
    editor.commands.setHorizontalRule();

    // One update for the rule, one for the paragraph after it — then it stops.
    expect(updates).toBe(2);
    // The caret sat in the trailing empty paragraph, which insertContent
    // replaces, so the second rule lands next to the first.
    expect(typesOf(editor)).toEqual([
      "paragraph",
      "horizontalRule",
      "horizontalRule",
      "paragraph",
    ]);
    editor.destroy();
  });

  it("does not fire again once the document ends in a paragraph", () => {
    let updates = 0;
    const editor = new Editor({
      content: "<p>done</p>",
      extensions: [Document, Paragraph, Text, TrailingNode],
      onUpdate: () => {
        updates += 1;
      },
    });

    expect(updates).toBe(0);

    editor.commands.insertContent("more");

    expect(updates).toBe(1);
    expect(typesOf(editor)).toEqual(["paragraph"]);
    editor.destroy();
  });

  it("keeps the trailing node out of its own undo step", () => {
    const editor = createEditor("<p>intro</p><hr>");

    expect(typesOf(editor)).toEqual([
      "paragraph",
      "horizontalRule",
      "paragraph",
    ]);

    editor.commands.undo();

    // Undo must not merely strip the scaffolding paragraph back off.
    expect(typesOf(editor)).not.toEqual(["paragraph", "horizontalRule"]);
    editor.destroy();
  });
});
