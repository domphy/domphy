import { describe, expect, it } from "vitest";
import { Editor } from "../../src/Editor";
import { Document } from "../../src/extensions/document";
import { Link } from "../../src/extensions/link";
import { Paragraph } from "../../src/extensions/paragraph";
import { Text } from "../../src/extensions/text";
import { UndoRedo } from "../../src/extensions/undoRedo";
import type { AnyExtension, JSONContent } from "../../src/types";

function createEditor(content: string, link: AnyExtension = Link) {
  const editor = new Editor({
    content,
    extensions: [Document, Paragraph, Text, UndoRedo, link],
  });
  editor.commands.setTextSelection(editor.selectionBounds.end);
  return editor;
}

/** Inline nodes of the first block, where the link marks live. */
const inlineOf = (editor: Editor): JSONContent[] =>
  editor.getJSON().content?.[0].content ?? [];

const hrefOf = (node: JSONContent | undefined) =>
  node?.marks?.find((mark) => mark.type === "link")?.attrs?.href;

const linkedNode = (editor: Editor) => inlineOf(editor).find((n) => hrefOf(n));

/** Type at the caret, giving input rules first refusal on each character. */
function type(editor: Editor, text: string): void {
  for (const character of text) {
    editor.insertTextWithRules(character);
  }
}

/** Run the merged Enter binding the way the view does. */
function pressEnter(editor: Editor): boolean {
  return editor.extensionManager.keyboardShortcuts.Enter?.({ editor }) ?? false;
}

describe("autolink", () => {
  it("links a URL followed by a space, over the word only", () => {
    const editor = createEditor("<p>see https://domphy.dev</p>");

    type(editor, " ");

    expect(linkedNode(editor)?.text).toBe("https://domphy.dev");
    expect(hrefOf(linkedNode(editor))).toBe("https://domphy.dev");
    // Text intact, space typed through, space not swallowed by the link.
    expect(editor.getText()).toBe("see https://domphy.dev ");
    expect(inlineOf(editor).filter((n) => hrefOf(n))).toHaveLength(1);
    editor.destroy();
  });

  it("gives a bare www. host the http protocol", () => {
    const editor = createEditor("<p>www.domphy.dev</p>");

    type(editor, " ");

    expect(hrefOf(linkedNode(editor))).toBe("http://www.domphy.dev");
    editor.destroy();
  });

  it("leaves trailing punctuation outside the link", () => {
    const editor = createEditor("<p>see https://domphy.dev.</p>");

    type(editor, " ");

    expect(linkedNode(editor)?.text).toBe("https://domphy.dev");
    expect(hrefOf(linkedNode(editor))).toBe("https://domphy.dev");
    expect(editor.getText()).toBe("see https://domphy.dev. ");
    editor.destroy();
  });

  it("ignores text that is not a URL", () => {
    const editor = createEditor("<p>not a url</p>");

    type(editor, " ");

    expect(linkedNode(editor)).toBeUndefined();
    expect(editor.getText()).toBe("not a url ");
    editor.destroy();
  });

  it("ignores a script URL", () => {
    const editor = createEditor("<p>javascript:alert(1)</p>");

    type(editor, " ");

    expect(linkedNode(editor)).toBeUndefined();
    editor.destroy();
  });

  it("ignores a bare domain with no scheme", () => {
    const editor = createEditor("<p>domphy.dev</p>");

    type(editor, " ");

    expect(linkedNode(editor)).toBeUndefined();
    editor.destroy();
  });

  it("leaves text inside an existing link alone", () => {
    const editor = createEditor(
      '<p><a href="https://example.com">https://domphy.dev</a></p>',
    );

    type(editor, " ");

    // Still the original href — autolink did not overwrite it.
    expect(hrefOf(linkedNode(editor))).toBe("https://example.com");
    editor.destroy();
  });

  it("links on Enter without consuming the key", () => {
    const editor = createEditor("<p>see https://domphy.dev</p>");

    // False means the view does not preventDefault, so splitBlock still runs.
    expect(pressEnter(editor)).toBe(false);
    expect(hrefOf(linkedNode(editor))).toBe("https://domphy.dev");
    editor.destroy();
  });

  it("undo after Enter reverts the link and the split in one step", () => {
    const editor = createEditor("<p>see https://domphy.dev</p>");

    pressEnter(editor);
    // The view turns the unconsumed Enter into a splitBlock — a second
    // transaction, which the autolink's history flag folds into one group.
    editor.commands.splitBlock();
    expect(hrefOf(linkedNode(editor))).toBe("https://domphy.dev");
    expect(editor.getJSON().content).toHaveLength(2);

    editor.commands.undo();

    expect(linkedNode(editor)).toBeUndefined();
    expect(editor.getJSON().content).toHaveLength(1);
    expect(editor.getText()).toBe("see https://domphy.dev");
    editor.destroy();
  });

  it("does not link a non-URL on Enter", () => {
    const editor = createEditor("<p>not a url</p>");

    expect(pressEnter(editor)).toBe(false);
    expect(linkedNode(editor)).toBeUndefined();
    editor.destroy();
  });

  it("does nothing when autolink is off", () => {
    const editor = createEditor(
      "<p>see https://domphy.dev</p>",
      Link.configure({ autolink: false }),
    );

    type(editor, " ");

    expect(linkedNode(editor)).toBeUndefined();
    expect(editor.getText()).toBe("see https://domphy.dev ");
    editor.destroy();
  });

  it("undo removes the link and keeps the text", () => {
    const editor = createEditor("<p>see https://domphy.dev</p>");

    type(editor, " ");
    expect(linkedNode(editor)).toBeDefined();

    editor.commands.undo();

    expect(linkedNode(editor)).toBeUndefined();
    expect(editor.getText()).toContain("https://domphy.dev");
    editor.destroy();
  });
});

describe("inclusive: false", () => {
  it("typing at the end of a link does not extend it", () => {
    const editor = createEditor('<p><a href="https://domphy.dev">ab</a></p>');

    // Caret sits at the document end, right after the linked text.
    type(editor, "X");

    expect(editor.getText()).toBe("abX");
    expect(linkedNode(editor)?.text).toBe("ab");
    expect(
      inlineOf(editor).find((node) => node.text === "X")?.marks,
    ).toBeUndefined();
    editor.destroy();
  });

  it("typing inside a link still extends it", () => {
    const editor = createEditor('<p><a href="https://domphy.dev">ab</a></p>');
    editor.commands.setTextSelection(2);

    type(editor, "X");

    expect(linkedNode(editor)?.text).toBe("aXb");
    editor.destroy();
  });

  it("typing between a link and plain text does not extend it", () => {
    const editor = createEditor('<p><a href="https://domphy.dev">ab</a>cd</p>');
    // Caret on the boundary between the linked "ab" and the plain "cd".
    editor.commands.setTextSelection(3);

    type(editor, "X");

    expect(editor.getText()).toBe("abXcd");
    expect(linkedNode(editor)?.text).toBe("ab");
    editor.destroy();
  });
});
