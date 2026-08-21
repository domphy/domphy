import { describe, expect, it, vi } from "vitest";
import { createDomphyTable } from "../src/domphy/index";
import type {
  Cell,
  CellEdit,
  CellEditingCell,
  CellEditingInstance,
  EditingCellId,
  Table,
} from "../src/index";
import { CellEditing, createColumnHelper, getCoreRowModel } from "../src/index";

// State notifications are microtask-batched; flush before asserting on listeners.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

type Person = { id: number; name: string; age: number };

const people: Person[] = [
  { id: 1, name: "Carol", age: 28 },
  { id: 2, name: "Alice", age: 45 },
  { id: 3, name: "Bob", age: 32 },
];

const helper = createColumnHelper<Person>();
const columns = [
  helper.accessor("name", { header: "Name" }),
  helper.accessor("age", { header: "Age" }),
];

function setup(extra?: {
  enableCellEditing?: boolean | ((cell: Cell<Person, unknown>) => boolean);
  onCellEdit?: (edit: CellEdit<Person>) => void;
}) {
  return createDomphyTable<Person>({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    _features: [CellEditing],
    ...extra,
  });
}

function cellAt(
  dTable: ReturnType<typeof setup>,
  rowIndex: number,
  columnIndex: number,
): Cell<Person, unknown> & CellEditingCell {
  const cell = dTable.table.getRowModel().rows[rowIndex].getAllCells()[
    columnIndex
  ];
  if (!cell.beginEdit) throw new Error("CellEditing is not installed");
  return cell as Cell<Person, unknown> & CellEditingCell;
}

function editingTable(
  table: Table<Person>,
): Table<Person> & CellEditingInstance<Person> {
  if (!table.getEditingCell) throw new Error("CellEditing is not installed");
  return table as Table<Person> & CellEditingInstance<Person>;
}

describe("CellEditing feature (opt-in via _features)", () => {
  it("starts with cellEditing: null", () => {
    const table = editingTable(setup().table);
    expect(table.getState().cellEditing).toBeNull();
    expect(table.getEditingCell()).toBeNull();
  });

  it("is not active without the feature — cells have no editing methods", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });
    const cell = dTable.table.getRowModel().rows[0].getAllCells()[0];
    expect((cell as Record<string, unknown>).beginEdit).toBeUndefined();
  });

  it("beginEdit sets the editing cell and goes through the controlled-state loop", async () => {
    const dTable = setup();
    const before = dTable.version();

    let stateCalls = 0;
    let observed: EditingCellId | null | undefined;
    dTable.state(() => {
      stateCalls++;
      observed = dTable.state().cellEditing;
    });

    const cell = cellAt(dTable, 0, 0);
    cell.beginEdit();

    expect(dTable.version()).toBe(before + 1);
    expect(dTable.state().cellEditing).toEqual({
      rowId: "0",
      columnId: "name",
    });
    expect(editingTable(dTable.table).getEditingCell()).toEqual({
      rowId: "0",
      columnId: "name",
    });

    await flush();
    expect(stateCalls).toBe(1);
    expect(observed).toEqual({ rowId: "0", columnId: "name" });
  });

  it("setEditingCell accepts an updater function", () => {
    const table = editingTable(setup().table);
    table.setEditingCell({ rowId: "1", columnId: "age" });
    expect(table.getEditingCell()).toEqual({ rowId: "1", columnId: "age" });

    table.setEditingCell((old) =>
      old ? null : { rowId: "0", columnId: "name" },
    );
    expect(table.getEditingCell()).toBeNull();
  });

  it("getIsEditing / getCanEdit reflect state and the enableCellEditing option", () => {
    const dTable = setup();
    const cell = cellAt(dTable, 0, 0);
    expect(cell.getCanEdit()).toBe(true);
    expect(cell.getIsEditing()).toBe(false);

    cell.beginEdit();
    expect(cell.getIsEditing()).toBe(true);
  });

  it("enableCellEditing: false disables beginEdit", () => {
    const dTable = setup({ enableCellEditing: false });
    const cell = cellAt(dTable, 0, 0);
    expect(cell.getCanEdit()).toBe(false);

    cell.beginEdit();
    expect(cell.getIsEditing()).toBe(false);
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();
  });

  it("enableCellEditing as a function gates per cell", () => {
    const dTable = setup({
      enableCellEditing: (cell) => cell.column.id !== "age",
    });
    const nameCell = cellAt(dTable, 0, 0);
    const ageCell = cellAt(dTable, 0, 1);

    expect(nameCell.getCanEdit()).toBe(true);
    expect(ageCell.getCanEdit()).toBe(false);

    ageCell.beginEdit();
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();

    nameCell.beginEdit();
    expect(editingTable(dTable.table).getEditingCell()).toEqual({
      rowId: "0",
      columnId: "name",
    });
  });

  it("commitEdit fires onCellEdit exactly once and clears the editing state", () => {
    const onCellEdit = vi.fn();
    const dTable = setup({ onCellEdit });
    const cell = cellAt(dTable, 1, 0);

    cell.beginEdit();
    cell.commitEdit("Alicia");

    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(onCellEdit.mock.calls[0][0]).toMatchObject({
      rowId: "1",
      columnId: "name",
      value: "Alicia",
    });
    expect(onCellEdit.mock.calls[0][0].cell).toBe(cell);
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();
    expect(cell.getIsEditing()).toBe(false);
  });

  it("cancelEdit clears the editing state without firing onCellEdit", () => {
    const onCellEdit = vi.fn();
    const dTable = setup({ onCellEdit });
    const cell = cellAt(dTable, 2, 1);

    cell.beginEdit();
    expect(cell.getIsEditing()).toBe(true);

    cell.cancelEdit();
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();
  });

  it("only one cell edits at a time — beginEdit on another cell moves the state", () => {
    const dTable = setup();
    const first = cellAt(dTable, 0, 0);
    const second = cellAt(dTable, 1, 1);

    first.beginEdit();
    expect(first.getIsEditing()).toBe(true);

    second.beginEdit();
    expect(first.getIsEditing()).toBe(false);
    expect(second.getIsEditing()).toBe(true);
    expect(editingTable(dTable.table).getEditingCell()).toEqual({
      rowId: "1",
      columnId: "age",
    });
  });

  it("resetEditingCell() without true restores initialState; true forces null", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      _features: [CellEditing],
      initialState: { cellEditing: { rowId: "0", columnId: "name" } },
    });
    const table = editingTable(dTable.table);
    const cell = cellAt(dTable, 1, 0);

    cell.beginEdit();
    expect(table.getEditingCell()).toEqual({ rowId: "1", columnId: "name" });

    table.resetEditingCell();
    expect(table.getEditingCell()).toEqual({ rowId: "0", columnId: "name" });

    cell.beginEdit();
    table.resetEditingCell(true);
    expect(table.getEditingCell()).toBeNull();
  });

  it("commitEdit exits edit mode even when initialState.cellEditing is set", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      _features: [CellEditing],
      initialState: { cellEditing: { rowId: "0", columnId: "name" } },
    });
    const cell = cellAt(dTable, 1, 0);
    cell.beginEdit();
    cell.commitEdit("Alicia");
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();
    expect(cell.getIsEditing()).toBe(false);
  });

  it("cancelEdit exits edit mode even when initialState.cellEditing is set", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      _features: [CellEditing],
      initialState: { cellEditing: { rowId: "0", columnId: "name" } },
    });
    const cell = cellAt(dTable, 1, 0);
    cell.beginEdit();
    cell.cancelEdit();
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();
  });

  it("commitEdit still exits edit mode when onCellEdit throws", () => {
    const onCellEdit = vi.fn(() => {
      throw new Error("persist failed");
    });
    const dTable = setup({ onCellEdit });
    const cell = cellAt(dTable, 0, 0);
    cell.beginEdit();

    expect(() => cell.commitEdit("x")).toThrow("persist failed");
    expect(editingTable(dTable.table).getEditingCell()).toBeNull();
    expect(cell.getIsEditing()).toBe(false);
  });
});
