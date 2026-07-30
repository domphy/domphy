import { Node } from "../Extendable";
import { nearestTextPosition, nodeSize } from "../model/position";
import type { Schema } from "../model/schema";
import { replaceAtPath } from "../model/tree";
import type {
  Attributes,
  CommandProps,
  JSONContent,
  RawCommands,
  ResolvedPosition,
  Transaction,
} from "../types";
import { mergeAttributes } from "./mergeAttributes";

export interface TableOptions {
  /** HTML attributes added to every rendered table. */
  HTMLAttributes: Attributes;
}

export interface TableCellOptions {
  /** HTML attributes added to every rendered cell. */
  HTMLAttributes: Attributes;
}

interface TableContext {
  node: JSONContent;
  /** Position of the table node itself. */
  pos: number;
  /** Position just inside the table, before its first row. */
  start: number;
  /** Child-index path from the doc root to the table node. */
  path: number[];
}

/** The table enclosing a position, or null when there is none. */
function tableAt(tr: Transaction, pos: number): TableContext | null {
  const resolved = tr.resolve(pos) as ResolvedPosition & {
    pathTo(depth: number): number[];
  };

  for (let depth = resolved.depth; depth >= 0; depth -= 1) {
    const node = resolved.node(depth);

    if (node.type === "table") {
      const start = resolved.start(depth);
      return { node, pos: start - 1, start, path: resolved.pathTo(depth) };
    }
  }

  return null;
}

/** Position just inside each cell, in document order. */
function cellPositions(
  schema: Schema,
  table: JSONContent,
  tableStart: number,
): number[] {
  const positions: number[] = [];
  let pos = tableStart;

  for (const row of table.content ?? []) {
    pos += 1;

    for (const cell of row.content ?? []) {
      positions.push(pos + 1);
      pos += nodeSize(schema, cell);
    }

    pos += 1;
  }

  return positions;
}

/** Index of the cell holding `pos`, or -1. */
function cellIndexAt(positions: number[], pos: number): number {
  return positions.filter((cellStart) => cellStart <= pos).length - 1;
}

/** The table node at `path`, or null when a stale path no longer lands on one. */
function tableAtPath(doc: JSONContent, path: number[]): JSONContent | null {
  let node: JSONContent | undefined = doc;

  for (const index of path) {
    node = node?.content?.[index];
  }

  return node?.type === "table" ? node : null;
}

/** The schema's default block, for the paragraph inside a fresh cell. */
function defaultBlock(schema: Schema): JSONContent {
  return schema.createNode(schema.defaultTypeFor("block") ?? "paragraph");
}

function emptyCell(schema: Schema, type: string): JSONContent {
  return { type, content: [defaultBlock(schema)] };
}

function buildRow(
  schema: Schema,
  columns: number,
  cellType: string,
): JSONContent {
  return {
    type: "tableRow",
    content: Array.from({ length: columns }, () => emptyCell(schema, cellType)),
  };
}

/** Row and column of a cell index, for a uniform grid. */
function cellCoordinates(table: JSONContent, cellIndex: number) {
  const columns = table.content?.[0]?.content?.length ?? 0;

  return {
    columns,
    row: columns > 0 ? Math.floor(cellIndex / columns) : 0,
    column: columns > 0 ? cellIndex % columns : 0,
  };
}

/** Move the caret `offset` cells along from the one holding it. */
function moveToCell({ tr, dispatch, editor }: CommandProps, offset: number) {
  const table = tableAt(tr, tr.selection.from);

  if (!table) {
    return false;
  }

  const schema = editor.schema as Schema;
  const positions = cellPositions(schema, table.node, table.start);
  const current = cellIndexAt(positions, tr.selection.from);
  const target = current === -1 ? undefined : positions[current + offset];

  if (target === undefined) {
    return false;
  }

  if (dispatch) {
    tr.setSelection(nearestTextPosition(schema, tr.doc, target));
  }

  return true;
}

/** Put the caret in the first cell of the table holding it. */
function moveToFirstCell({ tr, dispatch, editor }: CommandProps): boolean {
  const table = tableAt(tr, tr.selection.from);

  if (!table) {
    return false;
  }

  const schema = editor.schema as Schema;
  const first = cellPositions(schema, table.node, table.start)[0];

  if (first === undefined) {
    return false;
  }

  if (dispatch) {
    tr.setSelection(nearestTextPosition(schema, tr.doc, first));
  }

  return true;
}

/**
 * Rewrite the table around the caret. Returning null leaves it untouched.
 *
 * The table is relocated by its child-index path, not by node reference:
 * reference equality breaks the moment any earlier link in the chain rebuilt
 * an ancestor, which used to make the transform silently no-op while the
 * command still reported success. After the rewrite the caret is snapped back
 * into the table — the same cell when it still exists, the nearest surviving
 * cell when its row or column was deleted.
 */
function editTable(
  { tr, dispatch, editor }: CommandProps,
  rewrite: (
    table: JSONContent,
    cellIndex: number,
    schema: Schema,
  ) => JSONContent | null,
): boolean {
  const table = tableAt(tr, tr.selection.from);

  if (!table) {
    return false;
  }

  const schema = editor.schema as Schema;
  const positions = cellPositions(schema, table.node, table.start);
  const cellIndex = Math.max(0, cellIndexAt(positions, tr.selection.from));
  const cellStart = positions[cellIndex] ?? tr.selection.from;
  const offsetInCell = Math.max(0, tr.selection.from - cellStart);
  const next = rewrite(table.node, cellIndex, schema);

  if (!next) {
    return false;
  }

  if (dispatch) {
    tr.transform((doc) =>
      tableAtPath(doc, table.path)
        ? replaceAtPath(doc, table.path, next)
        : null,
    );
    const nextPositions = cellPositions(schema, next, table.start);
    const target = nextPositions[Math.min(cellIndex, nextPositions.length - 1)];

    if (target !== undefined) {
      tr.setSelection(target + offsetInCell);
    }
  }

  return true;
}

/**
 * A table of rows and cells.
 *
 * ponytail: `colspan`/`rowspan` are stored and rendered but not honoured by
 * the row and column commands, which assume a uniform grid. Merged cells need
 * a real table map — port prosemirror-tables' TableMap if that day comes.
 */
export const Table = Node.create<TableOptions>({
  name: "table",

  group: "block",

  content: "tableRow+",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: "table" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "table",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      ["tbody", 0],
    ];
  },

  addCommands(): RawCommands {
    return {
      insertTable:
        (options?: { rows?: number; cols?: number; withHeaderRow?: boolean }) =>
        ({ chain, editor }: CommandProps): boolean => {
          const rows = options?.rows ?? 3;
          const columns = options?.cols ?? 3;
          const withHeaderRow = options?.withHeaderRow ?? true;

          if (rows < 1 || columns < 1) {
            return false;
          }

          const schema = editor.schema as Schema;

          return (
            chain()
              .insertContent({
                type: this.name,
                content: Array.from({ length: rows }, (_unused, row) =>
                  buildRow(
                    schema,
                    columns,
                    withHeaderRow && row === 0 ? "tableHeader" : "tableCell",
                  ),
                ),
              })
              // Leave the caret in the first cell, ready to type.
              .command(moveToFirstCell)
              .run()
          );
        },

      deleteTable:
        () =>
        (props: CommandProps): boolean => {
          const { tr, dispatch, editor } = props;
          const table = tableAt(tr, tr.selection.from);

          if (!table) {
            return false;
          }

          if (dispatch) {
            tr.delete(
              table.pos,
              table.pos + nodeSize(editor.schema as Schema, table.node),
            );
          }

          return true;
        },

      addRowAfter:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex, schema) => {
            const { row, columns } = cellCoordinates(table, cellIndex);
            const rows = [...(table.content ?? [])];

            rows.splice(row + 1, 0, buildRow(schema, columns, "tableCell"));
            return { ...table, content: rows };
          }),

      deleteRow:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex) => {
            const rows = [...(table.content ?? [])];

            if (rows.length <= 1) {
              return null;
            }

            rows.splice(cellCoordinates(table, cellIndex).row, 1);
            return { ...table, content: rows };
          }),

      addColumnAfter:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex, schema) => {
            const { column } = cellCoordinates(table, cellIndex);

            return {
              ...table,
              content: (table.content ?? []).map((row) => {
                const cells = [...(row.content ?? [])];

                cells.splice(
                  column + 1,
                  0,
                  emptyCell(schema, cells[column]?.type ?? "tableCell"),
                );
                return { ...row, content: cells };
              }),
            };
          }),

      deleteColumn:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex) => {
            const { column, columns } = cellCoordinates(table, cellIndex);

            if (columns <= 1) {
              return null;
            }

            return {
              ...table,
              content: (table.content ?? []).map((row) => {
                const cells = [...(row.content ?? [])];

                cells.splice(column, 1);
                return { ...row, content: cells };
              }),
            };
          }),

      goToNextCell:
        () =>
        (props: CommandProps): boolean =>
          moveToCell(props, 1),

      goToPreviousCell:
        () =>
        (props: CommandProps): boolean =>
          moveToCell(props, -1),
    };
  },

  addKeyboardShortcuts() {
    return {
      // Tab past the last cell grows the table, the way tiptap does.
      Tab: ({ editor }) =>
        editor.commands.goToNextCell() ||
        (editor.commands.addRowAfter() && editor.commands.goToNextCell()),
      "Shift-Tab": ({ editor }) => editor.commands.goToPreviousCell(),
    };
  },
});

/** A row of cells. */
export const TableRow = Node.create({
  name: "tableRow",

  content: "(tableCell | tableHeader)+",

  parseHTML() {
    return [{ tag: "tr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["tr", HTMLAttributes, 0];
  },
});

function cellAttributes() {
  return {
    colspan: { default: 1 },
    rowspan: { default: 1 },
    colwidth: { default: null },
  };
}

/** A body cell. */
export const TableCell = Node.create<TableCellOptions>({
  name: "tableCell",

  group: "tableCell",

  content: "block+",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes: cellAttributes,

  parseHTML() {
    return [{ tag: "td" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "td",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});

/** A header cell. */
export const TableHeader = Node.create<TableCellOptions>({
  name: "tableHeader",

  group: "tableCell",

  content: "block+",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes: cellAttributes,

  parseHTML() {
    return [{ tag: "th" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "th",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },
});
