import { describe, expect, it } from "vitest";
import { Editor } from "../../src/Editor";
import { Document } from "../../src/extensions/document";
import { Paragraph } from "../../src/extensions/paragraph";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "../../src/extensions/table";
import { Text } from "../../src/extensions/text";
import { nodeSize } from "../../src/model/position";
import type { Schema } from "../../src/model/schema";

/**
 * Expected values for every case below were produced by running
 * prosemirror-tables 1.8.5 — the implementation this package's table map is
 * ported from — over the same fixture, driving each command from a text
 * selection inside each cell in turn, and normalising its output with the
 * same `shapeOf` below.
 *
 * Two entries are corrected rather than copied: `wideSpanTail`'s
 * `addRowAfter@4` and `addRowAfter@6` both land on the `addRow` slot-indexing
 * bug described in `table.ts`, where upstream emits a new row one cell short
 * of the grid width (`… / td() / …` instead of `… / td() td() / …`).
 */
const ORACLE: Record<
  string,
  { source: string; cells: number; expected: Record<string, string | null> }
> = {
  rowspanColspan: {
    source:
      '<table><tbody><tr><td><p>a1</p></td><td><p>b1</p></td><td><p>c1</p></td></tr><tr><td><p>a2</p></td><td colspan="2" rowspan="2"><p>bc23</p></td></tr><tr><td><p>a3</p></td></tr></tbody></table>',
    cells: 6,
    expected: {
      "addRowAfter@0":
        "td(a1) td(b1) td(c1) / td() td() td() / td(a2) td:2x2(bc23) / td(a3)",
      "deleteRow@0": "td(a2) td:2x2(bc23) / td(a3)",
      "addColumnAfter@0":
        "td(a1) td() td(b1) td(c1) / td(a2) td() td:2x2(bc23) / td(a3) td()",
      "deleteColumn@0": "td(b1) td(c1) / td:2x2(bc23) / td()",
      "addRowAfter@1":
        "td(a1) td(b1) td(c1) / td() td() td() / td(a2) td:2x2(bc23) / td(a3)",
      "deleteRow@1": "td(a2) td:2x2(bc23) / td(a3)",
      "addColumnAfter@1":
        "td(a1) td(b1) td() td(c1) / td(a2) td:3x2(bc23) / td(a3)",
      "deleteColumn@1": "td(a1) td(c1) / td(a2) td:1x2(bc23) / td(a3)",
      "addRowAfter@2":
        "td(a1) td(b1) td(c1) / td() td() td() / td(a2) td:2x2(bc23) / td(a3)",
      "deleteRow@2": "td(a2) td:2x2(bc23) / td(a3)",
      "addColumnAfter@2":
        "td(a1) td(b1) td(c1) td() / td(a2) td:2x2(bc23) td() / td(a3) td()",
      "deleteColumn@2": "td(a1) td(b1) / td(a2) td:1x2(bc23) / td(a3)",
      "addRowAfter@3":
        "td(a1) td(b1) td(c1) / td(a2) td:2x3(bc23) / td() / td(a3)",
      "deleteRow@3": "td(a1) td(b1) td(c1) / td(a3) td:2x1(bc23)",
      "addColumnAfter@3":
        "td(a1) td() td(b1) td(c1) / td(a2) td() td:2x2(bc23) / td(a3) td()",
      "deleteColumn@3": "td(b1) td(c1) / td:2x2(bc23) / td()",
      "addRowAfter@4":
        "td(a1) td(b1) td(c1) / td(a2) td:2x2(bc23) / td(a3) / td() td() td()",
      "deleteRow@4": "td(a1) td(b1) td(c1)",
      "addColumnAfter@4":
        "td(a1) td(b1) td(c1) td() / td(a2) td:2x2(bc23) td() / td(a3) td()",
      "deleteColumn@4": "td(a1) / td(a2) / td(a3)",
      "addRowAfter@5":
        "td(a1) td(b1) td(c1) / td(a2) td:2x2(bc23) / td(a3) / td() td() td()",
      "deleteRow@5": "td(a1) td(b1) td(c1) / td(a2) td:2x1(bc23)",
      "addColumnAfter@5":
        "td(a1) td() td(b1) td(c1) / td(a2) td() td:2x2(bc23) / td(a3) td()",
      "deleteColumn@5": "td(b1) td(c1) / td:2x2(bc23) / td()",
    },
  },
  headerColspan: {
    source:
      '<table><tbody><tr><th><p>h1</p></th><th><p>h2</p></th><th><p>h3</p></th></tr><tr><td colspan="2"><p>ab</p></td><td><p>c</p></td></tr><tr><td><p>a</p></td><td><p>b</p></td><td><p>c</p></td></tr></tbody></table>',
    cells: 8,
    expected: {
      "addRowAfter@0":
        "th(h1) th(h2) th(h3) / td() td() td() / td:2x1(ab) td(c) / td(a) td(b) td(c)",
      "deleteRow@0": "td:2x1(ab) td(c) / td(a) td(b) td(c)",
      "addColumnAfter@0":
        "th(h1) th() th(h2) th(h3) / td:3x1(ab) td(c) / td(a) td() td(b) td(c)",
      "deleteColumn@0": "th(h2) th(h3) / td(ab) td(c) / td(b) td(c)",
      "addRowAfter@1":
        "th(h1) th(h2) th(h3) / td() td() td() / td:2x1(ab) td(c) / td(a) td(b) td(c)",
      "deleteRow@1": "td:2x1(ab) td(c) / td(a) td(b) td(c)",
      "addColumnAfter@1":
        "th(h1) th(h2) th() th(h3) / td:2x1(ab) td() td(c) / td(a) td(b) td() td(c)",
      "deleteColumn@1": "th(h1) th(h3) / td(ab) td(c) / td(a) td(c)",
      "addRowAfter@2":
        "th(h1) th(h2) th(h3) / td() td() td() / td:2x1(ab) td(c) / td(a) td(b) td(c)",
      "deleteRow@2": "td:2x1(ab) td(c) / td(a) td(b) td(c)",
      "addColumnAfter@2":
        "th(h1) th(h2) th(h3) th() / td:2x1(ab) td(c) td() / td(a) td(b) td(c) td()",
      "deleteColumn@2": "th(h1) th(h2) / td:2x1(ab) / td(a) td(b)",
      "addRowAfter@3":
        "th(h1) th(h2) th(h3) / td:2x1(ab) td(c) / td() td() td() / td(a) td(b) td(c)",
      "deleteRow@3": "th(h1) th(h2) th(h3) / td(a) td(b) td(c)",
      "addColumnAfter@3":
        "th(h1) th(h2) th() th(h3) / td:2x1(ab) td() td(c) / td(a) td(b) td() td(c)",
      "deleteColumn@3": "th(h3) / td(c) / td(c)",
      "addRowAfter@4":
        "th(h1) th(h2) th(h3) / td:2x1(ab) td(c) / td() td() td() / td(a) td(b) td(c)",
      "deleteRow@4": "th(h1) th(h2) th(h3) / td(a) td(b) td(c)",
      "addColumnAfter@4":
        "th(h1) th(h2) th(h3) th() / td:2x1(ab) td(c) td() / td(a) td(b) td(c) td()",
      "deleteColumn@4": "th(h1) th(h2) / td:2x1(ab) / td(a) td(b)",
      "addRowAfter@5":
        "th(h1) th(h2) th(h3) / td:2x1(ab) td(c) / td(a) td(b) td(c) / td() td() td()",
      "deleteRow@5": "th(h1) th(h2) th(h3) / td:2x1(ab) td(c)",
      "addColumnAfter@5":
        "th(h1) th() th(h2) th(h3) / td:3x1(ab) td(c) / td(a) td() td(b) td(c)",
      "deleteColumn@5": "th(h2) th(h3) / td(ab) td(c) / td(b) td(c)",
      "addRowAfter@6":
        "th(h1) th(h2) th(h3) / td:2x1(ab) td(c) / td(a) td(b) td(c) / td() td() td()",
      "deleteRow@6": "th(h1) th(h2) th(h3) / td:2x1(ab) td(c)",
      "addColumnAfter@6":
        "th(h1) th(h2) th() th(h3) / td:2x1(ab) td() td(c) / td(a) td(b) td() td(c)",
      "deleteColumn@6": "th(h1) th(h3) / td(ab) td(c) / td(a) td(c)",
      "addRowAfter@7":
        "th(h1) th(h2) th(h3) / td:2x1(ab) td(c) / td(a) td(b) td(c) / td() td() td()",
      "deleteRow@7": "th(h1) th(h2) th(h3) / td:2x1(ab) td(c)",
      "addColumnAfter@7":
        "th(h1) th(h2) th(h3) th() / td:2x1(ab) td(c) td() / td(a) td(b) td(c) td()",
      "deleteColumn@7": "th(h1) th(h2) / td:2x1(ab) / td(a) td(b)",
    },
  },
  tallFirstColumn: {
    source:
      '<table><tbody><tr><td rowspan="2"><p>a12</p></td><td><p>b1</p></td></tr><tr><td><p>b2</p></td></tr><tr><td><p>a3</p></td><td><p>b3</p></td></tr></tbody></table>',
    cells: 5,
    expected: {
      "addRowAfter@0":
        "td:1x2(a12) td(b1) / td(b2) / td() td() / td(a3) td(b3)",
      "deleteRow@0": "td(a3) td(b3)",
      "addColumnAfter@0":
        "td:1x2(a12) td() td(b1) / td() td(b2) / td(a3) td() td(b3)",
      "deleteColumn@0": "td(b1) / td(b2) / td(b3)",
      "addRowAfter@1": "td:1x3(a12) td(b1) / td() / td(b2) / td(a3) td(b3)",
      "deleteRow@1": "td(a12) td(b2) / td(a3) td(b3)",
      "addColumnAfter@1":
        "td:1x2(a12) td(b1) td() / td(b2) td() / td(a3) td(b3) td()",
      "deleteColumn@1": "td:1x2(a12) / td() / td(a3)",
      "addRowAfter@2":
        "td:1x2(a12) td(b1) / td(b2) / td() td() / td(a3) td(b3)",
      "deleteRow@2": "td(a12) td(b1) / td(a3) td(b3)",
      "addColumnAfter@2":
        "td:1x2(a12) td(b1) td() / td(b2) td() / td(a3) td(b3) td()",
      "deleteColumn@2": "td:1x2(a12) / td() / td(a3)",
      "addRowAfter@3":
        "td:1x2(a12) td(b1) / td(b2) / td(a3) td(b3) / td() td()",
      "deleteRow@3": "td:1x2(a12) td(b1) / td(b2)",
      "addColumnAfter@3":
        "td:1x2(a12) td() td(b1) / td() td(b2) / td(a3) td() td(b3)",
      "deleteColumn@3": "td(b1) / td(b2) / td(b3)",
      "addRowAfter@4":
        "td:1x2(a12) td(b1) / td(b2) / td(a3) td(b3) / td() td()",
      "deleteRow@4": "td:1x2(a12) td(b1) / td(b2)",
      "addColumnAfter@4":
        "td:1x2(a12) td(b1) td() / td(b2) td() / td(a3) td(b3) td()",
      "deleteColumn@4": "td:1x2(a12) / td() / td(a3)",
    },
  },
  wideSpanTail: {
    source:
      '<table><tbody><tr><td><p>a1</p></td><td><p>b1</p></td><td><p>c1</p></td><td><p>d1</p></td></tr><tr><td><p>a2</p></td><td colspan="2" rowspan="2"><p>bc23</p></td><td><p>d2</p></td></tr><tr><td><p>a3</p></td><td><p>d3</p></td></tr></tbody></table>',
    cells: 9,
    expected: {
      "addRowAfter@0":
        "td(a1) td(b1) td(c1) td(d1) / td() td() td() td() / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "deleteRow@0": "td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "addColumnAfter@0":
        "td(a1) td() td(b1) td(c1) td(d1) / td(a2) td() td:2x2(bc23) td(d2) / td(a3) td() td(d3)",
      "deleteColumn@0": "td(b1) td(c1) td(d1) / td:2x2(bc23) td(d2) / td(d3)",
      "addRowAfter@1":
        "td(a1) td(b1) td(c1) td(d1) / td() td() td() td() / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "deleteRow@1": "td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "addColumnAfter@1":
        "td(a1) td(b1) td() td(c1) td(d1) / td(a2) td:3x2(bc23) td(d2) / td(a3) td(d3)",
      "deleteColumn@1":
        "td(a1) td(c1) td(d1) / td(a2) td:1x2(bc23) td(d2) / td(a3) td(d3)",
      "addRowAfter@2":
        "td(a1) td(b1) td(c1) td(d1) / td() td() td() td() / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "deleteRow@2": "td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "addColumnAfter@2":
        "td(a1) td(b1) td(c1) td() td(d1) / td(a2) td:2x2(bc23) td() td(d2) / td(a3) td() td(d3)",
      "deleteColumn@2":
        "td(a1) td(b1) td(d1) / td(a2) td:1x2(bc23) td(d2) / td(a3) td(d3)",
      "addRowAfter@3":
        "td(a1) td(b1) td(c1) td(d1) / td() td() td() td() / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "deleteRow@3": "td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3)",
      "addColumnAfter@3":
        "td(a1) td(b1) td(c1) td(d1) td() / td(a2) td:2x2(bc23) td(d2) td() / td(a3) td(d3) td()",
      "deleteColumn@3": "td(a1) td(b1) td(c1) / td(a2) td:2x2(bc23) / td(a3)",
      "addRowAfter@4":
        "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x3(bc23) td(d2) / td() td() / td(a3) td(d3)",
      "deleteRow@4": "td(a1) td(b1) td(c1) td(d1) / td(a3) td:2x1(bc23) td(d3)",
      "addColumnAfter@4":
        "td(a1) td() td(b1) td(c1) td(d1) / td(a2) td() td:2x2(bc23) td(d2) / td(a3) td() td(d3)",
      "deleteColumn@4": "td(b1) td(c1) td(d1) / td:2x2(bc23) td(d2) / td(d3)",
      "addRowAfter@5":
        "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3) / td() td() td() td()",
      "deleteRow@5": "td(a1) td(b1) td(c1) td(d1)",
      "addColumnAfter@5":
        "td(a1) td(b1) td(c1) td() td(d1) / td(a2) td:2x2(bc23) td() td(d2) / td(a3) td() td(d3)",
      "deleteColumn@5": "td(a1) td(d1) / td(a2) td(d2) / td(a3) td(d3)",
      "addRowAfter@6":
        "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x3(bc23) td(d2) / td() td() / td(a3) td(d3)",
      "deleteRow@6": "td(a1) td(b1) td(c1) td(d1) / td(a3) td:2x1(bc23) td(d3)",
      "addColumnAfter@6":
        "td(a1) td(b1) td(c1) td(d1) td() / td(a2) td:2x2(bc23) td(d2) td() / td(a3) td(d3) td()",
      "deleteColumn@6": "td(a1) td(b1) td(c1) / td(a2) td:2x2(bc23) / td(a3)",
      "addRowAfter@7":
        "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3) / td() td() td() td()",
      "deleteRow@7": "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x1(bc23) td(d2)",
      "addColumnAfter@7":
        "td(a1) td() td(b1) td(c1) td(d1) / td(a2) td() td:2x2(bc23) td(d2) / td(a3) td() td(d3)",
      "deleteColumn@7": "td(b1) td(c1) td(d1) / td:2x2(bc23) td(d2) / td(d3)",
      "addRowAfter@8":
        "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x2(bc23) td(d2) / td(a3) td(d3) / td() td() td() td()",
      "deleteRow@8": "td(a1) td(b1) td(c1) td(d1) / td(a2) td:2x1(bc23) td(d2)",
      "addColumnAfter@8":
        "td(a1) td(b1) td(c1) td(d1) td() / td(a2) td:2x2(bc23) td(d2) td() / td(a3) td(d3) td()",
      "deleteColumn@8": "td(a1) td(b1) td(c1) / td(a2) td:2x2(bc23) / td(a3)",
    },
  },
  singleRow: {
    source:
      "<table><tbody><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>",
    cells: 2,
    expected: {
      "addRowAfter@0": "td(a) td(b) / td() td()",
      "deleteRow@0": null,
      "addColumnAfter@0": "td(a) td() td(b)",
      "deleteColumn@0": "td(b)",
      "addRowAfter@1": "td(a) td(b) / td() td()",
      "deleteRow@1": null,
      "addColumnAfter@1": "td(a) td(b) td()",
      "deleteColumn@1": "td(a)",
    },
  },
  singleColumn: {
    source:
      "<table><tbody><tr><td><p>a</p></td></tr><tr><td><p>b</p></td></tr></tbody></table>",
    cells: 2,
    expected: {
      "addRowAfter@0": "td(a) / td() / td(b)",
      "deleteRow@0": "td(b)",
      "addColumnAfter@0": "td(a) td() / td(b) td()",
      "deleteColumn@0": null,
      "addRowAfter@1": "td(a) / td(b) / td()",
      "deleteRow@1": "td(a)",
      "addColumnAfter@1": "td(a) td() / td(b) td()",
      "deleteColumn@1": null,
    },
  },
};

function createEditor(content: string): Editor {
  return new Editor({
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
}

/** Tag, spans and text of every cell — what the two implementations must agree on. */
function shapeOf(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;

  return Array.from(container.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.children)
        .map((cell) => {
          const colspan = Number(cell.getAttribute("colspan") ?? 1);
          const rowspan = Number(cell.getAttribute("rowspan") ?? 1);
          const span =
            colspan === 1 && rowspan === 1 ? "" : `:${colspan}x${rowspan}`;
          return `${cell.tagName.toLowerCase()}${span}(${cell.textContent})`;
        })
        .join(" "),
    )
    .join(" / ");
}

/** A position inside the nth cell, in document order. */
function positionInCell(editor: Editor, cell: number): number {
  const schema = editor.schema as Schema;
  const starts: number[] = [];
  let pos = 0;

  for (const block of editor.state.doc.content ?? []) {
    if (block.type === "table") {
      let inside = pos + 1;

      for (const row of block.content ?? []) {
        inside += 1;

        for (const cellNode of row.content ?? []) {
          starts.push(inside + 1);
          inside += nodeSize(schema, cellNode);
        }

        inside += 1;
      }
    }

    pos += nodeSize(schema, block);
  }

  return starts[cell];
}

describe("table map vs prosemirror-tables 1.8.5", () => {
  for (const [name, fixture] of Object.entries(ORACLE)) {
    for (const [key, expected] of Object.entries(fixture.expected)) {
      const [command, cell] = key.split("@");

      it(`${name}: ${command} from cell ${cell} matches prosemirror-tables 1.8.5`, () => {
        const editor = createEditor(fixture.source);
        editor.commands.setTextSelection(positionInCell(editor, Number(cell)));

        const ran = (
          editor.commands as unknown as Record<string, () => boolean>
        )[command]();

        if (expected === null) {
          expect(ran).toBe(false);
          expect(shapeOf(editor.getHTML())).toBe(shapeOf(fixture.source));
          return;
        }

        expect(ran).toBe(true);
        expect(shapeOf(editor.getHTML())).toBe(expected);
      });
    }
  }

  it("goToNextCell walks document order across merged cells (prosemirror-tables findNextCell)", () => {
    const fixture = ORACLE.rowspanColspan;
    const editor = createEditor(fixture.source);
    const visited: string[] = [];
    editor.commands.setTextSelection(positionInCell(editor, 0));

    while (editor.commands.goToNextCell()) {
      const at = editor.state.selection.from;
      let index = -1;

      for (let cell = 0; cell < fixture.cells; cell += 1) {
        if (positionInCell(editor, cell) <= at) index = cell;
      }

      visited.push(String(index));
    }

    expect(visited).toEqual(["1", "2", "3", "4", "5"]);
  });
});
