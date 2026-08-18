import { describe, expect, it } from "vitest";

import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../src/extensions/table.js";
import { fromJSON, toJSON } from "../src/serialize/json.js";
import { block, createTestEditor, docOf, h, p } from "./fixtures.js";

function bolded(text: string) {
  return { type: "text", text, marks: [{ type: "bold" }] };
}

describe("content commands", () => {
  it("setContent replaces the whole document", () => {
    const editor = createTestEditor(docOf(p("old")));
    expect(editor.commands.setContent(docOf(p("new")))).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("new")));
  });

  it("setContent with emitUpdate false does not emit update", () => {
    const editor = createTestEditor(docOf(p("old")));
    let updates = 0;
    editor.on("update", () => {
      updates += 1;
    });
    editor.commands.setContent(docOf(p("quiet")), { emitUpdate: false });
    expect(updates).toBe(0);
    editor.commands.setContent(docOf(p("loud")));
    expect(updates).toBe(1);
  });

  it("insertContent inserts inline text at the cursor", () => {
    const editor = createTestEditor(docOf(p("ac")));
    editor.commands.setTextSelection(2);
    editor.commands.insertContent("b");
    expect(editor.getJSON()).toEqual(docOf(p("abc")));
    expect(editor.state.selection.from).toBe(3);
  });

  it("insertContent of a block node replaces an empty paragraph", () => {
    const editor = createTestEditor(docOf(p("keep"), p()));
    editor.commands.setTextSelection(7);
    editor.commands.insertContent({ type: "horizontalRule" });
    expect(editor.getHTML()).toBe("<p>keep</p><hr>");
  });

  it("insertContentAt replaces a range with a block", () => {
    const editor = createTestEditor(docOf(p("abc")));
    editor.commands.insertContentAt(
      { from: 1, to: 4 },
      docOf({ type: "horizontalRule" }),
    );
    expect(editor.getJSON()).toEqual(docOf({ type: "horizontalRule" }));
  });
});

describe("mark commands", () => {
  it("setMark applies over a range", () => {
    const editor = createTestEditor(docOf(p("hello")));
    editor.commands.setTextSelection({ from: 1, to: 3 });
    expect(editor.commands.setMark("bold")).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p(bolded("he"), "llo")));
  });

  it("setMark on an empty selection sets stored marks", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection(2);
    editor.commands.setMark("bold");
    expect(editor.state.storedMarks).toEqual([{ type: "bold", attrs: {} }]);
  });

  it("toggleMark adds then removes", () => {
    const editor = createTestEditor(docOf(p("hello")));
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.toggleMark("bold");
    expect(editor.getHTML()).toBe("<p><strong>hello</strong></p>");
    editor.commands.toggleMark("bold");
    expect(editor.getHTML()).toBe("<p>hello</p>");
  });

  it("unsetMark removes only the requested mark", () => {
    const editor = createTestEditor(
      docOf(
        p({
          type: "text",
          text: "x",
          marks: [{ type: "bold" }, { type: "italic" }],
        }),
      ),
    );
    editor.commands.setTextSelection({ from: 1, to: 2 });
    editor.commands.unsetMark("bold");
    expect(editor.getHTML()).toBe("<p><em>x</em></p>");
  });

  it("unsetMark on a cursor clears the stored mark, not the surrounding word", () => {
    const editor = createTestEditor(docOf(p(bolded("hello"))));
    editor.commands.setTextSelection(3);
    editor.commands.unsetMark("bold");
    // the word keeps its mark; only the next insert is unbolded
    expect(editor.getHTML()).toBe("<p><strong>hello</strong></p>");
    expect(editor.state.storedMarks).toEqual([]);
    editor.commands.insertContent("X");
    expect(editor.getHTML()).toBe(
      "<p><strong>he</strong>X<strong>llo</strong></p>",
    );
  });

  it("unsetMark with extendEmptyMarkRange clears the whole mark range", () => {
    const editor = createTestEditor(docOf(p("a", bolded("link"), "b")));
    editor.commands.setTextSelection(4);
    editor.commands.unsetMark("bold", { extendEmptyMarkRange: true });
    expect(editor.getHTML()).toBe("<p>alinkb</p>");
  });

  it("toggleMark forwards extendEmptyMarkRange when the mark is active", () => {
    const editor = createTestEditor(docOf(p("a", bolded("link"), "b")));
    editor.commands.setTextSelection(4);
    editor.commands.toggleMark("bold", undefined, {
      extendEmptyMarkRange: true,
    });
    expect(editor.getHTML()).toBe("<p>alinkb</p>");
  });

  it("an excluding mark drops the marks it excludes", () => {
    const editor = createTestEditor(docOf(p(bolded("code"))));
    editor.commands.setTextSelection({ from: 1, to: 5 });
    editor.commands.setMark("code");
    expect(editor.getHTML()).toBe("<p><code>code</code></p>");
  });

  it("updateAttributes rewrites mark attributes", () => {
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
    expect(editor.commands.updateAttributes("link", { href: "/b" })).toBe(true);
    expect(editor.getJSON().content?.[0].content?.[0].marks?.[0].attrs).toEqual(
      { href: "/b" },
    );
  });
});

describe("node commands", () => {
  it("setNode converts the textblock", () => {
    const editor = createTestEditor(docOf(p("Title")));
    editor.commands.setTextSelection(2);
    expect(editor.commands.setNode("heading", { level: 2 })).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(h(2, "Title")));
  });

  it("toggleNode flips back to the toggle type", () => {
    const editor = createTestEditor(docOf(h(2, "Title")));
    editor.commands.setTextSelection(2);
    editor.commands.toggleNode("heading", "paragraph", { level: 2 });
    expect(editor.getJSON()).toEqual(docOf(p("Title")));
  });

  it("updateAttributes rewrites node attributes", () => {
    const editor = createTestEditor(docOf(h(1, "Title")));
    editor.commands.setTextSelection(2);
    expect(editor.commands.updateAttributes("heading", { level: 4 })).toBe(
      true,
    );
    expect(editor.getJSON()).toEqual(docOf(h(4, "Title")));
  });

  it("wrapIn and lift wrap and unwrap a blockquote", () => {
    const editor = createTestEditor(docOf(p("quote")));
    editor.commands.setTextSelection(2);
    expect(editor.commands.wrapIn("blockquote")).toBe(true);
    expect(editor.getJSON()).toEqual(
      docOf(block("blockquote", undefined, [p("quote")])),
    );
    expect(editor.commands.lift("blockquote")).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("quote")));
  });

  it("toggleWrap keeps the cursor inside the wrapped block", () => {
    const editor = createTestEditor(docOf(p("quote")));
    editor.commands.setTextSelection(3);
    editor.commands.toggleWrap("blockquote");
    // doc > blockquote(0) > paragraph(1) > content starts at 2
    expect(editor.state.selection.from).toBe(4);
  });

  it("clearNodes normalizes back to paragraphs at doc level", () => {
    const editor = createTestEditor(
      docOf(block("blockquote", undefined, [h(2, "x")])),
    );
    editor.commands.setTextSelection(3);
    editor.commands.clearNodes();
    expect(editor.getJSON()).toEqual(docOf(p("x")));
  });
});

describe("list commands", () => {
  it("toggleList wraps each block in its own item", () => {
    const editor = createTestEditor(docOf(p("one"), p("two")));
    editor.commands.setTextSelection({ from: 1, to: 9 });
    expect(editor.commands.toggleList("bulletList", "listItem")).toBe(true);
    expect(editor.getHTML()).toBe(
      "<ul><li><p>one</p></li><li><p>two</p></li></ul>",
    );
  });

  it("toggleList on an active list lifts the item out", () => {
    const editor = createTestEditor(docOf(p("one")));
    editor.commands.setTextSelection(2);
    editor.commands.toggleList("bulletList", "listItem");
    editor.commands.toggleList("bulletList", "listItem");
    expect(editor.getJSON()).toEqual(docOf(p("one")));
  });

  it("toggleList switches between list types", () => {
    const editor = createTestEditor(docOf(p("one")));
    editor.commands.setTextSelection(2);
    editor.commands.toggleList("bulletList", "listItem");
    editor.commands.toggleList("orderedList", "listItem");
    expect(editor.getHTML()).toBe("<ol><li><p>one</p></li></ol>");
  });

  it("toggleList can() matches dispatch on a heading (clearNodes path)", () => {
    const editor = createTestEditor(docOf(h(2, "Title")));
    editor.commands.setTextSelection(2);
    const allowed = editor.can().toggleList("bulletList", "listItem");
    const applied = editor.commands.toggleList("bulletList", "listItem");
    expect(allowed).toBe(applied);
    expect(applied).toBe(true);
    expect(editor.getHTML()).toBe("<ul><li><p>Title</p></li></ul>");
  });

  it("splitListItem creates a sibling item", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection(2);
    editor.commands.toggleList("bulletList", "listItem");
    editor.commands.splitListItem("listItem");
    expect(editor.getHTML()).toBe(
      "<ul><li><p>a</p></li><li><p>b</p></li></ul>",
    );
  });

  it("splitListItem on an empty item lifts out of the list", () => {
    const editor = createTestEditor(docOf(p("")));
    editor.commands.setTextSelection(1);
    editor.commands.toggleList("bulletList", "listItem");
    editor.commands.splitListItem("listItem");
    expect(editor.getJSON()).toEqual(docOf(p()));
  });

  it("sinkListItem nests under the previous item", () => {
    const editor = createTestEditor(docOf(p("one"), p("two")));
    editor.commands.setTextSelection({ from: 1, to: 9 });
    editor.commands.toggleList("bulletList", "listItem");
    // inside the second list item: ul(0) li(1) p(2) "one"(3..6) li(7) p(8) "two"(9..)
    editor.commands.setTextSelection(11);
    expect(editor.commands.sinkListItem("listItem")).toBe(true);
    expect(editor.getHTML()).toBe(
      "<ul><li><p>one</p><ul><li><p>two</p></li></ul></li></ul>",
    );
  });

  it("liftListItem moves a nested item back out", () => {
    const editor = createTestEditor(docOf(p("one"), p("two")));
    editor.commands.setTextSelection({ from: 1, to: 9 });
    editor.commands.toggleList("bulletList", "listItem");
    editor.commands.setTextSelection(11);
    editor.commands.sinkListItem("listItem");
    editor.commands.setTextSelection(editor.state.selection.from);
    editor.commands.liftListItem("listItem");
    expect(editor.getHTML()).toBe(
      "<ul><li><p>one</p></li><li><p>two</p></li></ul>",
    );
  });
});

describe("structure commands", () => {
  it("splitBlock splits the textblock", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection(2);
    expect(editor.commands.splitBlock()).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("a"), p("b")));
    expect(editor.state.selection.from).toBe(4);
  });

  it("splitBlock at the end of a heading starts a paragraph", () => {
    const editor = createTestEditor(docOf(h(2, "Title")));
    editor.commands.setTextSelection(6);
    editor.commands.splitBlock();
    expect(editor.getJSON()).toEqual(docOf(h(2, "Title"), p()));
  });

  it("exitCode leaves a code block", () => {
    const editor = createTestEditor(
      docOf({ type: "codeBlock", content: [{ type: "text", text: "x" }] }),
    );
    editor.commands.setTextSelection(2);
    expect(editor.commands.exitCode()).toBe(true);
    expect(editor.getHTML()).toBe("<pre><code>x</code></pre><p></p>");
  });

  it("selectAll spans the whole document", () => {
    const editor = createTestEditor(docOf(p("ab"), p("cd")));
    editor.commands.selectAll();
    // first text position .. last text position, not the doc boundaries
    expect(editor.state.selection).toMatchObject({ from: 1, to: 7 });
  });

  it("deleteSelection merges across blocks", () => {
    const editor = createTestEditor(docOf(p("ab"), p("cd")));
    editor.commands.setTextSelection({ from: 2, to: 6 });
    expect(editor.commands.deleteSelection()).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("ad")));
  });

  it("deleteSelection reports false on an empty selection", () => {
    const editor = createTestEditor(docOf(p("ab")));
    editor.commands.setTextSelection(2);
    expect(editor.commands.deleteSelection()).toBe(false);
  });

  it("deleteRange joins two paragraphs", () => {
    const editor = createTestEditor(docOf(p("ab"), p("cd")));
    editor.commands.deleteRange({ from: 3, to: 5 });
    expect(editor.getJSON()).toEqual(docOf(p("abcd")));
  });

  it("deleting the whole document resets the block to the default type", () => {
    const editor = createTestEditor(docOf(h(2, "Title"), p("body")));
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    expect(editor.getJSON()).toEqual(docOf(p()));
  });

  it("keeps the block type when only part of the document is deleted", () => {
    const editor = createTestEditor(docOf(h(2, "Title"), p("body")));
    editor.commands.setTextSelection({ from: 3, to: 12 });
    editor.commands.deleteSelection();
    expect(editor.getJSON()).toEqual(docOf(h(2, "Ti")));
  });

  it("deleting everything leaves one empty paragraph", () => {
    const editor = createTestEditor(docOf(p("ab"), p("cd")));
    editor.commands.selectAll();
    editor.commands.deleteSelection();
    expect(editor.getJSON()).toEqual(docOf(p()));
    expect(editor.isEmpty).toBe(true);
  });
});

describe("isEmpty", () => {
  it("treats a vacant document and a single empty paragraph as empty", () => {
    expect(createTestEditor(docOf(p())).isEmpty).toBe(true);
    expect(createTestEditor(null).isEmpty).toBe(true);
  });

  it("treats a paragraph with text as non-empty", () => {
    expect(createTestEditor(docOf(p("x"))).isEmpty).toBe(false);
  });

  it("treats an atom such as a horizontal rule as non-empty", () => {
    expect(createTestEditor(docOf({ type: "horizontalRule" })).isEmpty).toBe(
      false,
    );
  });

  it("treats an empty table as non-empty structure", () => {
    const editor = createTestEditor(docOf(p()), [
      Table,
      TableRow,
      TableCell,
      TableHeader,
    ]);
    editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });
    expect(editor.getText().trim()).toBe("");
    expect(editor.isEmpty).toBe(false);
  });
});

describe("cross-depth deleteRange", () => {
  /** Every node's children must fit its content expression (no bare text in wrappers). */
  function expectSchemaValid(
    editor: ReturnType<typeof createTestEditor>,
  ): void {
    const schema = editor.schema as import("../src/model/schema.js").Schema;
    const walk = (node: import("../src/types.js").JSONContent) => {
      const name = node.type ?? "";
      for (const child of node.content ?? []) {
        expect(
          schema.allowsContent(name, child.type ?? ""),
          `${name} must not directly hold ${child.type}`,
        ).toBe(true);
        walk(child);
      }
    };
    walk(editor.state.doc);
  }

  /** getJSON -> fromJSON must be a fixed point, or saved content mutates on load. */
  function expectStableRoundTrip(
    editor: ReturnType<typeof createTestEditor>,
  ): void {
    const schema = editor.schema as import("../src/model/schema.js").Schema;
    const json = editor.getJSON();
    expect(
      toJSON(schema, fromJSON(schema, json)),
      "serialize -> rehydrate changed the document",
    ).toEqual(json);
  }

  it("joins a trailing paragraph into a blockquote's textblock", () => {
    const editor = createTestEditor(
      docOf(block("blockquote", undefined, [p("ab")]), p("cd")),
    );
    // Backspace at the start of "cd": end of "ab" (4) -> caret (7).
    editor.commands.deleteRange({ from: 4, to: 7 });
    expect(editor.getJSON()).toEqual(
      docOf(block("blockquote", undefined, [p("abcd")])),
    );
    expectSchemaValid(editor);
    expectStableRoundTrip(editor);
  });

  it("joins a trailing paragraph into a list item's textblock", () => {
    const editor = createTestEditor(
      docOf(
        block("bulletList", undefined, [
          block("listItem", undefined, [p("ab")]),
        ]),
        p("cd"),
      ),
    );
    // Backspace at the start of "cd": end of "ab" (5) -> caret (9).
    editor.commands.deleteRange({ from: 5, to: 9 });
    expect(editor.getJSON()).toEqual(
      docOf(
        block("bulletList", undefined, [
          block("listItem", undefined, [p("abcd")]),
        ]),
      ),
    );
    expectSchemaValid(editor);
    expectStableRoundTrip(editor);
  });

  it("keeps the deeper right side's wrapper chain", () => {
    const editor = createTestEditor(
      docOf(p("ab"), block("blockquote", undefined, [p("cd")])),
    );
    // Delete from the end of "ab" (3) to the start of "cd" (6).
    editor.commands.deleteRange({ from: 3, to: 6 });
    expect(editor.getJSON()).toEqual(
      docOf(block("blockquote", undefined, [p("abcd")])),
    );
    expectSchemaValid(editor);
    expectStableRoundTrip(editor);
  });

  it("joins into the second item of a multi-item list", () => {
    const editor = createTestEditor(
      docOf(
        block("bulletList", undefined, [
          block("listItem", undefined, [p("ab")]),
          block("listItem", undefined, [p("cd")]),
        ]),
        p("ef"),
      ),
    );
    // End of "cd" (11) -> start of "ef" (15).
    editor.commands.deleteRange({ from: 11, to: 15 });
    expect(editor.getJSON()).toEqual(
      docOf(
        block("bulletList", undefined, [
          block("listItem", undefined, [p("ab")]),
          block("listItem", undefined, [p("cdef")]),
        ]),
      ),
    );
    expectSchemaValid(editor);
    expectStableRoundTrip(editor);
  });

  it("joins into a nested list's textblock", () => {
    const editor = createTestEditor(
      docOf(
        block("bulletList", undefined, [
          block("listItem", undefined, [
            p("ab"),
            block("bulletList", undefined, [
              block("listItem", undefined, [p("cd")]),
            ]),
          ]),
        ]),
        p("ef"),
      ),
    );
    // Positions: ul 0, li 1, p 2 ("ab" 3-5), ul 6, li 7, p 8 ("cd" 9-11),
    // closes 12-15, p"ef" 16 ("ef" 17-19).
    editor.commands.deleteRange({ from: 11, to: 17 });
    expect(editor.getJSON()).toEqual(
      docOf(
        block("bulletList", undefined, [
          block("listItem", undefined, [
            p("ab"),
            block("bulletList", undefined, [
              block("listItem", undefined, [p("cdef")]),
            ]),
          ]),
        ]),
      ),
    );
    expectSchemaValid(editor);
    expectStableRoundTrip(editor);
  });

  it("ordered list variant stays schema-valid", () => {
    const editor = createTestEditor(
      docOf(
        block("orderedList", undefined, [
          block("listItem", undefined, [p("ab")]),
        ]),
        p("cd"),
      ),
    );
    editor.commands.deleteRange({ from: 5, to: 9 });
    expect(editor.getJSON()).toEqual(
      docOf(
        block("orderedList", undefined, [
          block("listItem", undefined, [p("abcd")]),
        ]),
      ),
    );
    expectSchemaValid(editor);
    expectStableRoundTrip(editor);
  });
});

describe("command helpers", () => {
  it("command runs an inline function with the transaction", () => {
    const editor = createTestEditor(docOf(p("ab")));
    const result = editor.commands.command(({ tr }) => {
      tr.insertText("!", 3, 3);
      return true;
    });
    expect(result).toBe(true);
    expect(editor.getJSON()).toEqual(docOf(p("ab!")));
  });

  it("first stops at the command that succeeds", () => {
    const editor = createTestEditor(docOf(p("ab")));
    const calls: string[] = [];
    editor.commands.first([
      () => {
        calls.push("a");
        return false;
      },
      () => {
        calls.push("b");
        return true;
      },
      () => {
        calls.push("c");
        return true;
      },
    ]);
    expect(calls).toEqual(["a", "b"]);
  });
});
