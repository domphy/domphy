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

const BODY_CELL = "tableCell";
const HEADER_CELL = "tableHeader";

/**
 * A fresh cell: `createNode` already fills in the default attrs (`colspan`,
 * `rowspan`, `colwidth`) and the required paragraph, which the row and column
 * commands need because they rewrite the document tree with no hydration pass
 * behind them.
 */
function emptyCell(schema: Schema, type: string): JSONContent {
  return schema.createNode(type);
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

// ---------------------------------------------------------------------------
// Table map
//
// A port of prosemirror-tables' `TableMap` (dist/index.js, 1.8.5) onto this
// package's JSON tree. Same shape: a `width * height` grid of slots, each
// holding the cell that covers it, so a cell with `colspan`/`rowspan` occupies
// several slots. The difference is what a slot stores — upstream stores the
// cell's document position, this stores its index in the table's flat,
// document-order cell list, which is the coordinate the JSON rewrites need.
// ---------------------------------------------------------------------------

/** Empty grid slot. Upstream uses 0, which a real position can never be. */
const NO_CELL = -1;

interface GridCell {
  node: JSONContent;
  /** Index of the row holding it. */
  row: number;
  /** Index within that row's cells. */
  index: number;
}

interface TableGrid {
  width: number;
  height: number;
  /** `width * height` slots, each a flat cell index or {@link NO_CELL}. */
  map: number[];
  /** Every cell, in document order. */
  cells: GridCell[];
  /** Cell count per row, so an append lands past the last cell. */
  rowLengths: number[];
}

/** Grid rectangle a cell covers: `[left, right)` x `[top, bottom)`. */
interface CellRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function spanOf(cell: JSONContent, name: "colspan" | "rowspan"): number {
  const value = Number(cell.attrs?.[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

/** prosemirror-tables' `findWidth`: the widest row, counting rowspan carry-over. */
function gridWidth(rows: JSONContent[]): number {
  let width = -1;
  let hasRowSpan = false;

  for (let row = 0; row < rows.length; row += 1) {
    let rowWidth = 0;

    if (hasRowSpan) {
      for (let earlier = 0; earlier < row; earlier += 1) {
        for (const cell of rows[earlier].content ?? []) {
          if (earlier + spanOf(cell, "rowspan") > row) {
            rowWidth += spanOf(cell, "colspan");
          }
        }
      }
    }

    for (const cell of rows[row].content ?? []) {
      rowWidth += spanOf(cell, "colspan");

      if (spanOf(cell, "rowspan") > 1) {
        hasRowSpan = true;
      }
    }

    width = width === -1 ? rowWidth : Math.max(width, rowWidth);
  }

  return Math.max(width, 0);
}

/** prosemirror-tables' `computeMap`, minus the "problems" repair reporting. */
function tableGrid(table: JSONContent): TableGrid {
  const rows = table.content ?? [];
  const height = rows.length;
  const width = gridWidth(rows);
  const map = new Array<number>(width * height).fill(NO_CELL);
  const cells: GridCell[] = [];
  const rowLengths: number[] = [];
  let slot = 0;

  for (let row = 0; row < height; row += 1) {
    const rowCells = rows[row].content ?? [];
    rowLengths.push(rowCells.length);

    for (let index = 0; ; index += 1) {
      while (slot < map.length && map[slot] !== NO_CELL) {
        slot += 1;
      }

      if (index === rowCells.length) {
        break;
      }

      const node = rowCells[index];
      const cellIndex = cells.length;
      cells.push({ node, row, index });

      const colspan = spanOf(node, "colspan");

      for (let down = 0; down < spanOf(node, "rowspan"); down += 1) {
        if (row + down >= height) {
          break;
        }

        const start = slot + down * width;

        for (let across = 0; across < colspan; across += 1) {
          if (map[start + across] === NO_CELL) {
            map[start + across] = cellIndex;
          }
        }
      }

      slot += colspan;
    }

    // Skip past any hole left by a row with too few cells.
    slot = (row + 1) * width;
  }

  return { width, height, map, cells, rowLengths };
}

/** prosemirror-tables' `TableMap.findCell`. */
function cellRect(grid: TableGrid, cellIndex: number): CellRect {
  const first = grid.map.indexOf(cellIndex);

  if (first === -1) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  const left = first % grid.width;
  const top = Math.floor(first / grid.width);
  let right = left + 1;
  let bottom = top + 1;

  while (right < grid.width && grid.map[first + (right - left)] === cellIndex) {
    right += 1;
  }

  while (
    bottom < grid.height &&
    grid.map[first + grid.width * (bottom - top)] === cellIndex
  ) {
    bottom += 1;
  }

  return { left, top, right, bottom };
}

/**
 * Where a new cell for grid column `col` goes within row `row`'s own cells —
 * prosemirror-tables' `TableMap.positionAt`, which likewise skips the slots
 * held by cells that started in an earlier row.
 */
function insertIndexInRow(grid: TableGrid, row: number, col: number): number {
  for (let scan = col; scan < grid.width; scan += 1) {
    const cellIndex = grid.map[row * grid.width + scan];

    if (cellIndex !== NO_CELL && grid.cells[cellIndex]?.row === row) {
      return grid.cells[cellIndex].index;
    }
  }

  return grid.rowLengths[row] ?? 0;
}

function isHeaderLine(
  grid: TableGrid,
  slotAt: (line: number) => number,
  length: number,
): boolean {
  for (let line = 0; line < length; line += 1) {
    const cellIndex = grid.map[slotAt(line)];

    if (
      cellIndex === undefined ||
      cellIndex === NO_CELL ||
      grid.cells[cellIndex].node.type !== HEADER_CELL
    ) {
      return false;
    }
  }

  return true;
}

/** prosemirror-tables' `columnIsHeader`. */
function isHeaderColumn(grid: TableGrid, col: number): boolean {
  if (col < 0 || col >= grid.width) {
    return false;
  }

  return isHeaderLine(grid, (row) => row * grid.width + col, grid.height);
}

/** prosemirror-tables' `rowIsHeader`. */
function isHeaderRow(grid: TableGrid, row: number): boolean {
  if (row < 0 || row >= grid.height) {
    return false;
  }

  return isHeaderLine(grid, (col) => row * grid.width + col, grid.width);
}

/** prosemirror-tables' `addColSpan` / `removeColSpan`. */
function withColSpan(
  cell: JSONContent,
  offsetInCell: number,
  delta: number,
): JSONContent {
  const attrs: Attributes = {
    ...cell.attrs,
    colspan: spanOf(cell, "colspan") + delta,
  };
  const colwidth = cell.attrs?.colwidth;

  if (Array.isArray(colwidth)) {
    const widths = [...colwidth];

    if (delta > 0) {
      widths.splice(offsetInCell, 0, ...new Array<number>(delta).fill(0));
    } else {
      widths.splice(offsetInCell, -delta);
    }

    attrs.colwidth = widths.some((width) => Number(width) > 0) ? widths : null;
  }

  return { ...cell, attrs };
}

function withRowSpan(cell: JSONContent, delta: number): JSONContent {
  return {
    ...cell,
    attrs: { ...cell.attrs, rowspan: spanOf(cell, "rowspan") + delta },
  };
}

/** A row whose cells can be spliced — `JSONContent.content` is optional. */
type MutableRow = JSONContent & { content: JSONContent[] };

function cloneRows(table: JSONContent): MutableRow[] {
  return (table.content ?? []).map((row) => ({
    ...row,
    content: [...(row.content ?? [])],
  }));
}

/** prosemirror-tables' `addColumn`. */
function addColumn(
  schema: Schema,
  table: JSONContent,
  grid: TableGrid,
  col: number,
): JSONContent {
  const rows = cloneRows(table);
  let reference: number | null = col > 0 ? -1 : 0;

  if (isHeaderColumn(grid, col + reference)) {
    reference = col === 0 || col === grid.width ? null : 0;
  }

  for (let row = 0; row < grid.height; row += 1) {
    const slot = row * grid.width + col;
    const covering =
      col > 0 && col < grid.width ? (grid.map[slot] ?? NO_CELL) : NO_CELL;

    if (covering !== NO_CELL && grid.map[slot - 1] === covering) {
      // The cell straddles the insertion point: widen it instead.
      const cell = grid.cells[covering];
      rows[cell.row].content[cell.index] = withColSpan(
        cell.node,
        col - cellRect(grid, covering).left,
        1,
      );
      row += spanOf(cell.node, "rowspan") - 1;
      continue;
    }

    const neighbour =
      reference === null ? NO_CELL : (grid.map[slot + reference] ?? NO_CELL);
    const type =
      neighbour === NO_CELL
        ? BODY_CELL
        : (grid.cells[neighbour].node.type ?? BODY_CELL);

    rows[row].content.splice(
      insertIndexInRow(grid, row, col),
      0,
      emptyCell(schema, type),
    );
  }

  return { ...table, content: rows };
}

/**
 * prosemirror-tables' `removeColumn`, plus the refill ProseMirror gets for
 * free: deleting the last cell of a row leaves content that `(tableCell |
 * tableHeader)+` forbids, and prosemirror-transform's fitting puts an empty
 * cell back. These JSON rewrites have no schema-repair pass behind them, so
 * the row is refilled here.
 */
function removeColumn(
  schema: Schema,
  table: JSONContent,
  grid: TableGrid,
  col: number,
): JSONContent {
  const rows = cloneRows(table);
  const removals: GridCell[] = [];

  for (let row = 0; row < grid.height; ) {
    const slot = row * grid.width + col;
    const cellIndex = grid.map[slot] ?? NO_CELL;

    if (cellIndex === NO_CELL) {
      row += 1;
      continue;
    }

    const cell = grid.cells[cellIndex];
    const straddles =
      (col > 0 && grid.map[slot - 1] === cellIndex) ||
      (col < grid.width - 1 && grid.map[slot + 1] === cellIndex);

    if (straddles) {
      rows[cell.row].content[cell.index] = withColSpan(
        cell.node,
        col - cellRect(grid, cellIndex).left,
        -1,
      );
    } else {
      removals.push(cell);
    }

    row += spanOf(cell.node, "rowspan");
  }

  for (const cell of removals.sort((a, b) => b.index - a.index)) {
    rows[cell.row].content.splice(cell.index, 1);
  }

  for (const row of rows) {
    if (row.content.length === 0) {
      row.content.push(emptyCell(schema, BODY_CELL));
    }
  }

  return { ...table, content: rows };
}

/**
 * prosemirror-tables' `addRow`, with one deliberate divergence: upstream
 * advances `col` past a wide cell (`col += attrs.colspan - 1`) without
 * advancing the parallel `index` it reads the map with, so after a cell that
 * is both `colspan > 1` and vertically spanning, every later column is read
 * one slot short. Measured against prosemirror-tables 1.8.5 on a 4-wide table
 * whose row 1 is `a2 | colspan=2 rowspan=2 | d2`: `addRowAfter` in the first
 * cell emits a new row holding ONE cell where the grid needs two, dropping the
 * last column. Here the slot is derived from `col`, so the row comes out
 * complete.
 */
function addRow(
  schema: Schema,
  table: JSONContent,
  grid: TableGrid,
  row: number,
): JSONContent {
  const rows = cloneRows(table);
  const cells: JSONContent[] = [];
  let reference: number | null = row > 0 ? -1 : 0;

  if (isHeaderRow(grid, row + reference)) {
    reference = row === 0 || row === grid.height ? null : 0;
  }

  for (let col = 0; col < grid.width; col += 1) {
    const slot = row * grid.width + col;
    const covering =
      row > 0 && row < grid.height ? (grid.map[slot] ?? NO_CELL) : NO_CELL;

    if (covering !== NO_CELL && grid.map[slot - grid.width] === covering) {
      // The cell straddles the insertion point: make it one row taller.
      const cell = grid.cells[covering];
      rows[cell.row].content[cell.index] = withRowSpan(cell.node, 1);
      col += spanOf(cell.node, "colspan") - 1;
      continue;
    }

    const neighbour =
      reference === null
        ? NO_CELL
        : (grid.map[slot + reference * grid.width] ?? NO_CELL);
    const type =
      neighbour === NO_CELL
        ? BODY_CELL
        : (grid.cells[neighbour].node.type ?? BODY_CELL);

    cells.push(emptyCell(schema, type));
  }

  rows.splice(row, 0, { type: "tableRow", content: cells });
  return { ...table, content: rows };
}

/** prosemirror-tables' `removeRow`. */
function removeRow(
  table: JSONContent,
  grid: TableGrid,
  row: number,
): JSONContent {
  const rows = cloneRows(table);
  const seen = new Set<number>();
  // Cells pushed down into the next row arrive left to right, so each insert
  // sits one further along than the index the original grid reported.
  let pushedDown = 0;

  for (let col = 0; col < grid.width; col += 1) {
    const slot = row * grid.width + col;
    const cellIndex = grid.map[slot] ?? NO_CELL;

    if (cellIndex === NO_CELL || seen.has(cellIndex)) {
      continue;
    }

    seen.add(cellIndex);
    const cell = grid.cells[cellIndex];

    if (row > 0 && grid.map[slot - grid.width] === cellIndex) {
      // Started above: it just gets shorter.
      rows[cell.row].content[cell.index] = withRowSpan(cell.node, -1);
      col += spanOf(cell.node, "colspan") - 1;
    } else if (
      row + 1 < grid.height &&
      grid.map[slot + grid.width] === cellIndex
    ) {
      // Starts here and continues below: move it into the next row.
      rows[row + 1].content.splice(
        insertIndexInRow(grid, row + 1, col) + pushedDown,
        0,
        withRowSpan(cell.node, -1),
      );
      pushedDown += 1;
      col += spanOf(cell.node, "colspan") - 1;
    }
  }

  rows.splice(row, 1);
  return { ...table, content: rows };
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
 * A table of rows and cells, with `colspan`/`rowspan` honoured by the row and
 * column commands (see the table map above, ported from prosemirror-tables).
 *
 * ponytail: no cell selection, so a command acts on the one cell holding the
 * caret — for a merged cell that is its whole rectangle, which is what
 * prosemirror-tables does for a text selection too. Add `CellSelection` only
 * if multi-cell operations are asked for.
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
            const grid = tableGrid(table);
            return addRow(
              schema,
              table,
              grid,
              cellRect(grid, cellIndex).bottom,
            );
          }),

      deleteRow:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex) => {
            const grid = tableGrid(table);
            const { top, bottom } = cellRect(grid, cellIndex);

            // Deleting every row would delete the table, which `deleteTable`
            // is for — prosemirror-tables refuses it the same way.
            if (top === 0 && bottom === grid.height) {
              return null;
            }

            // Upstream removes bottom-up, re-reading the map after each row,
            // because a removal can reshape the ones above it.
            let next = table;

            for (let row = bottom - 1; row >= top; row -= 1) {
              next = removeRow(next, tableGrid(next), row);
            }

            return next;
          }),

      addColumnAfter:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex, schema) => {
            const grid = tableGrid(table);
            return addColumn(
              schema,
              table,
              grid,
              cellRect(grid, cellIndex).right,
            );
          }),

      deleteColumn:
        () =>
        (props: CommandProps): boolean =>
          editTable(props, (table, cellIndex, schema) => {
            const grid = tableGrid(table);
            const { left, right } = cellRect(grid, cellIndex);

            if (left === 0 && right === grid.width) {
              return null;
            }

            let next = table;

            for (let col = right - 1; col >= left; col -= 1) {
              next = removeColumn(schema, next, tableGrid(next), col);
            }

            return next;
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
