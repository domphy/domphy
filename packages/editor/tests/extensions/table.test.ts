import { describe, expect, it } from "vitest";
import { Editor } from "../../src/Editor";
import { Node } from "../../src/Extendable";
import { Document } from "../../src/extensions/document";
import { Paragraph } from "../../src/extensions/paragraph";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../../src/extensions/table";
import { Text } from "../../src/extensions/text";
import { Underline } from "../../src/extensions/underline";
import { open } from "./harness";

function createEditor(content: string | null = null) {
  const editor = new Editor({
    content,
    extensions: [
      Document,
      Paragraph,
      Text,
      Table,
      TableRow,
      TableCell,
      TableHeader,
    ],
  });
  editor.commands.setTextSelection(editor.selectionBounds.end);
  return editor;
}

/** Cell type names per row, the shape assertions all read from. */
function grid(editor: Editor): string[][] {
  const table = editor.getJSON().content?.find((node) => node.type === "table");

  return (table?.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => cell.type ?? ""),
  );
}

describe("table schema", () => {
  it("declares the row and cell containment", () => {
    expect(Table.config).toMatchObject({
      group: "block",
      content: "tableRow+",
    });
    expect(TableRow.config).toMatchObject({
      content: "(tableCell | tableHeader)+",
    });
    expect(TableCell.config).toMatchObject({
      group: "tableCell",
      content: "block+",
    });
    expect(TableHeader.config).toMatchObject({
      group: "tableCell",
      content: "block+",
    });
  });

  it("renders a tbody wrapper and the cell tags", () => {
    expect(open(Table).render()).toEqual(["table", {}, ["tbody", 0]]);
    expect(open(TableRow).render()).toEqual(["tr", {}, 0]);
    expect(open(TableCell).render()).toEqual(["td", {}, 0]);
    expect(open(TableHeader).render()).toEqual(["th", {}, 0]);
  });

  it("defaults the span attributes", () => {
    expect(open(TableCell).attributes()).toEqual({
      colspan: { default: 1 },
      rowspan: { default: 1 },
      colwidth: { default: null },
    });
  });

  it("parses a table back from HTML", () => {
    const editor = createEditor(
      "<table><tbody><tr><th>a</th><td>b</td></tr></tbody></table>",
    );

    expect(grid(editor)).toEqual([["tableHeader", "tableCell"]]);
    editor.destroy();
  });
});

describe("insertTable", () => {
  it("builds a 3x3 with a header row by default", () => {
    const editor = createEditor("<p></p>");

    editor.commands.insertTable();

    expect(grid(editor)).toEqual([
      ["tableHeader", "tableHeader", "tableHeader"],
      ["tableCell", "tableCell", "tableCell"],
      ["tableCell", "tableCell", "tableCell"],
    ]);
    editor.destroy();
  });

  it("honours rows, cols and withHeaderRow", () => {
    const editor = createEditor("<p></p>");

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });

    expect(grid(editor)).toEqual([
      ["tableCell", "tableCell"],
      ["tableCell", "tableCell"],
    ]);
    editor.destroy();
  });

  it("refuses an empty table", () => {
    const editor = createEditor("<p></p>");

    expect(editor.commands.insertTable({ rows: 0, cols: 3 })).toBe(false);
    expect(grid(editor)).toEqual([]);
    editor.destroy();
  });
});

describe("table editing", () => {
  function tableEditor() {
    const editor = createEditor("<p></p>");

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
    return editor;
  }

  it("adds and deletes a row at the caret", () => {
    const editor = tableEditor();

    expect(editor.commands.addRowAfter()).toBe(true);
    expect(grid(editor)).toHaveLength(3);

    expect(editor.commands.deleteRow()).toBe(true);
    expect(grid(editor)).toHaveLength(2);
    editor.destroy();
  });

  it("adds and deletes a column at the caret", () => {
    const editor = tableEditor();

    expect(editor.commands.addColumnAfter()).toBe(true);
    expect(grid(editor).map((row) => row.length)).toEqual([3, 3]);

    expect(editor.commands.deleteColumn()).toBe(true);
    expect(grid(editor).map((row) => row.length)).toEqual([2, 2]);
    editor.destroy();
  });

  it("keeps the last row and column", () => {
    const editor = createEditor("<p></p>");

    editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });

    expect(editor.commands.deleteRow()).toBe(false);
    expect(editor.commands.deleteColumn()).toBe(false);
    expect(grid(editor)).toEqual([["tableCell"]]);
    editor.destroy();
  });

  it("deletes the whole table", () => {
    const editor = tableEditor();

    expect(editor.commands.deleteTable()).toBe(true);
    expect(grid(editor)).toEqual([]);
    editor.destroy();
  });

  it("does nothing outside a table", () => {
    const editor = createEditor("<p>plain</p>");

    expect(editor.commands.deleteTable()).toBe(false);
    expect(editor.commands.addRowAfter()).toBe(false);
    expect(editor.commands.goToNextCell()).toBe(false);
    editor.destroy();
  });

  it("keeps the caret in its cell after adding a row", () => {
    const editor = tableEditor();

    editor.commands.insertContent("a");
    editor.commands.addRowAfter();
    editor.commands.insertContent("b");

    const table = editor.getJSON().content?.find((n) => n.type === "table");
    const firstCell = table?.content?.[0].content?.[0];
    expect(firstCell?.content?.[0].content?.[0]).toMatchObject({ text: "ab" });
    editor.destroy();
  });

  it("snaps the caret into a surviving cell after deleting its row", () => {
    const editor = tableEditor();

    editor.commands.insertContent("a");
    editor.commands.deleteRow();
    expect(grid(editor)).toEqual([["tableCell", "tableCell"]]);

    // Typing must land inside the surviving table, not mid-table or past it.
    editor.commands.insertContent("b");
    const table = editor.getJSON().content?.find((n) => n.type === "table");
    expect(JSON.stringify(table)).toContain('"b"');
    editor.destroy();
  });

  it("snaps the caret into a surviving cell after deleting its column", () => {
    const editor = tableEditor();

    editor.commands.deleteColumn();
    expect(grid(editor)).toEqual([["tableCell"], ["tableCell"]]);

    editor.commands.insertContent("b");
    const table = editor.getJSON().content?.find((n) => n.type === "table");
    expect(JSON.stringify(table)).toContain('"b"');
    editor.destroy();
  });

  it("applies after an earlier chain link rebuilt the document", () => {
    const editor = tableEditor();

    const ran = editor
      .chain()
      .command(({ tr }) => {
        // Rebuild every ancestor reference, the way wrap/lift links do.
        tr.transform((doc) => ({ ...doc, content: [...(doc.content ?? [])] }));
        return true;
      })
      .addRowAfter()
      .run();

    expect(ran).toBe(true);
    expect(grid(editor)).toHaveLength(3);
    editor.destroy();
  });

  it("fills new cells with the schema's default block type", () => {
    const Section = Node.create({
      name: "section",
      group: "block",
      content: "inline*",
      parseHTML: () => [{ tag: "section" }],
      renderHTML: ({ HTMLAttributes }) => ["section", HTMLAttributes, 0],
    });
    const editor = new Editor({
      content: "<section></section>",
      extensions: [
        Document,
        Section,
        Text,
        Table,
        TableRow,
        TableCell,
        TableHeader,
      ],
    });
    editor.commands.setTextSelection(editor.selectionBounds.end);

    editor.commands.insertTable({ rows: 1, cols: 1, withHeaderRow: false });

    const table = editor.getJSON().content?.find((n) => n.type === "table");
    expect(table?.content?.[0].content?.[0].content?.[0].type).toBe("section");
    editor.destroy();
  });
});

describe("cell navigation", () => {
  function tableEditor() {
    const editor = createEditor("<p></p>");

    editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: false });
    return editor;
  }

  it("walks forward and back through the cells", () => {
    const editor = tableEditor();
    const first = editor.state.selection.from;

    expect(editor.commands.goToNextCell()).toBe(true);
    const second = editor.state.selection.from;
    expect(second).toBeGreaterThan(first);

    expect(editor.commands.goToPreviousCell()).toBe(true);
    expect(editor.state.selection.from).toBe(first);
    editor.destroy();
  });

  it("stops at the last cell", () => {
    const editor = tableEditor();

    // Four cells: three hops land on the last one.
    expect(editor.commands.goToNextCell()).toBe(true);
    expect(editor.commands.goToNextCell()).toBe(true);
    expect(editor.commands.goToNextCell()).toBe(true);
    expect(editor.commands.goToNextCell()).toBe(false);
    editor.destroy();
  });

  it("Tab grows the table past the last cell", () => {
    const editor = tableEditor();
    const tab = editor.extensionManager.keyboardShortcuts.Tab;

    editor.commands.goToNextCell();
    editor.commands.goToNextCell();
    editor.commands.goToNextCell();

    expect(tab?.({ editor })).toBe(true);
    expect(grid(editor)).toHaveLength(3);
    editor.destroy();
  });
});

describe("underline", () => {
  const underline = open(Underline);

  it("parses and renders <u>", () => {
    expect(underline.parseRules()).toEqual([{ tag: "u" }]);
    expect(underline.render()).toEqual(["u", {}, 0]);
  });

  it("registers the mark commands and Mod-u", () => {
    expect(underline.commandNames()).toEqual([
      "setUnderline",
      "toggleUnderline",
      "unsetUnderline",
    ]);
    expect(underline.shortcutKeys()).toEqual(["Mod-u", "Mod-U"]);
  });

  it("round-trips through HTML", () => {
    const editor = new Editor({
      content: "<p><u>under</u></p>",
      extensions: [Document, Paragraph, Text, Underline],
    });

    expect(editor.getHTML()).toContain("<u>under</u>");
    editor.destroy();
  });
});
