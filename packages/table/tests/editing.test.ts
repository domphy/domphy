import { describe, expect, it, vi } from "vitest";
import { createDomphyTable } from "../src/domphy/index";
import type { Cell, CellEdit, EditingCellId } from "../src/index";
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
) {
  return dTable.table.getRowModel().rows[rowIndex].getAllCells()[columnIndex];
}

describe("CellEditing feature (opt-in via _features)", () => {
  it("starts with cellEditing: null", () => {
    const { table } = setup();
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
    expect(dTable.table.getEditingCell()).toEqual({
      rowId: "0",
      columnId: "name",
    });

    await flush();
    expect(stateCalls).toBe(1);
    expect(observed).toEqual({ rowId: "0", columnId: "name" });
  });

  it("setEditingCell accepts an updater function", () => {
    const { table } = setup();
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
    expect(dTable.table.getEditingCell()).toBeNull();
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
    expect(dTable.table.getEditingCell()).toBeNull();

    nameCell.beginEdit();
    expect(dTable.table.getEditingCell()).toEqual({
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
    expect(dTable.table.getEditingCell()).toBeNull();
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
    expect(dTable.table.getEditingCell()).toBeNull();
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
    expect(dTable.table.getEditingCell()).toEqual({
      rowId: "1",
      columnId: "age",
    });
  });

  it("resetEditingCell restores the initial state", () => {
    const dTable = setup();
    const cell = cellAt(dTable, 0, 0);
    cell.beginEdit();
    expect(dTable.table.getEditingCell()).not.toBeNull();

    dTable.table.resetEditingCell();
    expect(dTable.table.getEditingCell()).toBeNull();
  });
});
