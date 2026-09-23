/**
 * Behaviours pinned to a source of truth outside this codebase: named
 * ProseMirror / Tiptap functions whose semantics every peer editor ships.
 * Each `it` title names the upstream function it is copied from.
 */
import { describe, expect, it } from "vitest";

import { Editor } from "../src/Editor.js";
import { Link } from "../src/extensions/link.js";
import type { AnyExtension } from "../src/types.js";
import { testExtensions } from "./fixtures.js";

const mounted: Editor[] = [];

function mount(
  content: string,
  extra: AnyExtension[] = [],
): { editor: Editor; host: HTMLElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: [...testExtensions, ...extra],
    content,
  });
  mounted.push(editor);
  return { editor, host };
}

function fakeClipboard(entries: Record<string, string>) {
  return { getData: (type: string) => entries[type] ?? "" };
}

function paste(host: HTMLElement, entries: Record<string, string>): void {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", {
    value: fakeClipboard(entries),
  });
  host.dispatchEvent(event);
}

function beforeInput(host: HTMLElement, inputType: string): void {
  host.dispatchEvent(
    new InputEvent("beforeinput", {
      inputType,
      bubbles: true,
      cancelable: true,
    }),
  );
}

describe("prosemirror-model from_dom.ts ignoreTags", () => {
  it("drops the text inside <script>, <style> and <title> (prosemirror-model ignoreTags = head/noscript/object/script/style/title)", () => {
    const { editor, host } = mount("<p></p>");
    editor.commands.focus("end");
    paste(host, {
      "text/html":
        "<style>body{display:none}</style><p>kept</p><script>alert(1)</script>",
    });
    expect(editor.getHTML()).toBe("<p>kept</p>");
  });
});

describe("prosemirror-view clipboard parseFromClipboard, text/plain branch", () => {
  it("inserts text/plain verbatim — markup characters stay literal text (ProseMirror never parses text/plain as HTML)", () => {
    const { editor, host } = mount("<p></p>");
    editor.commands.focus("end");
    paste(host, { "text/plain": "<b>not bold</b>" });
    expect(editor.getHTML()).toBe("<p>&lt;b&gt;not bold&lt;/b&gt;</p>");
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("splits text/plain on newlines into one block per line (ProseMirror: `text.split(/(?:\\r\\n?|\\n)+/)` becomes separate blocks)", () => {
    const { editor, host } = mount("<p></p>");
    editor.commands.focus("end");
    paste(host, { "text/plain": "one\ntwo" });
    expect(editor.getHTML()).toBe("<p>one</p><p>two</p>");
  });

  it("merges the first and last line into the block holding the caret (ProseMirror pastes text/plain as an OPEN slice — Slice.maxOpen)", () => {
    const { editor, host } = mount("<p>XY</p>");
    editor.commands.setTextSelection(2);
    paste(host, { "text/plain": "one\ntwo" });
    expect(editor.getHTML()).toBe("<p>Xone</p><p>twoY</p>");
  });

  it("keeps newlines as content when pasting into a code textblock (ProseMirror parses clipboard text with preserveWhitespace inside `code` nodes)", () => {
    const { editor, host } = mount("<pre><code></code></pre>");
    editor.commands.setTextSelection(1);
    paste(host, { "text/plain": "a\nb" });
    expect(editor.getHTML()).toBe("<pre><code>a\nb</code></pre>");
  });
});

describe("prosemirror-commands newlineInCode", () => {
  it("Enter inside a code textblock inserts a newline instead of splitting (baseKeymap: chainCommands(newlineInCode, ...) )", () => {
    const { editor, host } = mount("<pre><code>a</code></pre>");
    editor.commands.focus("end");
    beforeInput(host, "insertParagraph");
    expect(editor.getHTML()).toBe("<pre><code>a\n</code></pre>");
  });
});

describe("prosemirror-commands joinBackward", () => {
  it("Backspace at the start of the first list item lifts it out of the list (joinBackward: 'If there is no node before this, try to lift')", () => {
    const { editor, host } = mount("<ul><li><p>solo</p></li></ul>");
    editor.commands.setTextSelection(3);
    beforeInput(host, "deleteContentBackward");
    expect(editor.getHTML()).toBe("<p>solo</p>");
  });

  it("Backspace at the start of a top-level paragraph is a no-op (liftTarget is null at the top node)", () => {
    const { editor, host } = mount("<p>para</p>");
    editor.commands.setTextSelection(1);
    beforeInput(host, "deleteContentBackward");
    expect(editor.getHTML()).toBe("<p>para</p>");
  });
});

describe("tiptap Link isAllowedUri", () => {
  it("setContent and insertContent drop a javascript: href, like the constructor does", () => {
    const evil = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    };
    // The real Link extension, not the fixture mark: `isAllowedUri` is what
    // the strip pass consults.
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new Editor({
      element: host,
      // Fixture `link` swapped for the real extension: `isAllowedUri` is what
      // the strip pass consults, and the fixture mark has none.
      extensions: [
        ...testExtensions.filter((extension) => extension.name !== "link"),
        Link,
      ],
      content: "<p></p>",
    });
    mounted.push(editor);
    editor.commands.setContent(evil);
    expect(editor.getHTML()).toBe("<p>click</p>");
    editor.commands.setContent("<p></p>");
    editor.commands.insertContent(evil.content[0]);
    expect(editor.getHTML()).toBe("<p>click</p>");
  });
});
