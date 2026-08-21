import { describe, expect, it, vi } from "vitest";
import { createDomphyTable } from "../src/domphy/index";
import type { TableState } from "../src/index";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "../src/index";

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

function setup(extra?: { onStateChange?: (updater: unknown) => void }) {
  return createDomphyTable<Person>({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
    ...extra,
  });
}

describe("createDomphyTable.state accessor", () => {
  it("notifies a state listener (not only version) on a table change", async () => {
    const { table, state } = setup();
    let stateCalls = 0;
    let observed: TableState | undefined;
    state(() => {
      stateCalls++;
      observed = state();
    });

    table.getColumn("name")?.toggleSorting(false);

    // Value is available synchronously even before the listener flush.
    expect(state().sorting).toEqual([{ id: "name", desc: false }]);

    await flush();
    expect(stateCalls).toBe(1);
    expect(observed?.sorting).toEqual([{ id: "name", desc: false }]);
  });
});

describe("createDomphyTable.setState", () => {
  it("applies a functional updater and bumps version", () => {
    const { table, version, setState } = setup();
    const before = version();

    setState((old) => ({
      ...old,
      pagination: { ...old.pagination, pageIndex: 1 },
    }));

    expect(version()).toBe(before + 1);
    expect(table.getState().pagination.pageIndex).toBe(1);
    expect(table.getRowModel().rows.length).toBe(1); // last page has 1 row
  });

  it("applies a value updater", () => {
    const { table, version, setState } = setup();
    const before = version();
    const next: TableState = {
      ...table.getState(),
      sorting: [{ id: "age", desc: true }],
    };

    setState(next);

    expect(version()).toBe(before + 1);
    expect(table.getState().sorting).toEqual([{ id: "age", desc: true }]);
  });
});

describe("createDomphyTable user onStateChange pass-through", () => {
  it("still calls a user-supplied onStateChange on every change", () => {
    const onStateChange = vi.fn();
    const { table } = setup({ onStateChange });

    table.getColumn("age")?.toggleSorting(false);
    table.nextPage();

    expect(onStateChange).toHaveBeenCalledTimes(2);
    // The adapter forwards the raw updater table-core produced.
    expect(typeof onStateChange.mock.calls[0][0]).toBe("function");
  });
});

describe("DomphyTable reactive convenience reads", () => {
  it("getRowModel returns rows and subscribes listener to version", async () => {
    const dTable = setup();
    let calls = 0;
    const listener = () => {
      calls++;
      dTable.getRowModel(listener);
    };
    dTable.getRowModel(listener);

    // Trigger a change — sort on name asc.
    dTable.table.getColumn("name")?.toggleSorting(false);

    await flush();
    expect(calls).toBeGreaterThan(0);
    expect(dTable.getRowModel().rows[0].original.name).toBe("Alice");
  });

  it("getHeaderGroups returns header groups", () => {
    const dTable = setup();
    const groups = dTable.getHeaderGroups();
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].headers.length).toBe(2); // name + age columns
  });

  it("getAllLeafColumns returns all leaf columns", () => {
    const dTable = setup();
    expect(dTable.getAllLeafColumns().length).toBe(2);
  });

  it("getVisibleLeafColumns reflects column visibility", () => {
    const dTable = setup();
    expect(dTable.getVisibleLeafColumns().length).toBe(2);
    dTable.table.getColumn("age")?.toggleVisibility(false);
    expect(dTable.getVisibleLeafColumns().length).toBe(1);
  });

  it("getIsAllColumnsVisible / getIsSomeColumnsVisible reflect state", () => {
    const dTable = setup();
    expect(dTable.getIsAllColumnsVisible()).toBe(true);
    dTable.table.getColumn("age")?.toggleVisibility(false);
    expect(dTable.getIsAllColumnsVisible()).toBe(false);
    expect(dTable.getIsSomeColumnsVisible()).toBe(true);
  });

  it("getCanNextPage / getCanPreviousPage / getPageCount reflect pagination", () => {
    const dTable = setup(); // pageSize=2, 3 rows → 2 pages
    expect(dTable.getPageCount()).toBe(2);
    expect(dTable.getCanPreviousPage()).toBe(false);
    expect(dTable.getCanNextPage()).toBe(true);

    dTable.table.nextPage();
    expect(dTable.getCanPreviousPage()).toBe(true);
    expect(dTable.getCanNextPage()).toBe(false);
  });

  it("getIsAllRowsSelected / getIsSomeRowsSelected reflect selection", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      enableRowSelection: true,
    });
    expect(dTable.getIsAllRowsSelected()).toBe(false);
    expect(dTable.getIsSomeRowsSelected()).toBe(false);

    dTable.table.toggleAllRowsSelected(true);
    expect(dTable.getIsAllRowsSelected()).toBe(true);
  });

  it("getSelectedRowModel returns selected rows", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      enableRowSelection: true,
    });
    dTable.table.toggleAllRowsSelected(true);
    expect(dTable.getSelectedRowModel().rows.length).toBe(people.length);
  });

  it("getIsAllRowsExpanded reflects expanded state", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });
    // No sub-rows, so all rows are trivially expanded.
    expect(typeof dTable.getIsAllRowsExpanded()).toBe("boolean");
  });

  it("convenience reads notify a listener on version change", async () => {
    const dTable = setup();
    let pageCalls = 0;
    const listener = () => {
      pageCalls++;
      dTable.getPageCount(listener);
    };
    dTable.getPageCount(listener);

    dTable.table.nextPage();
    await flush();
    expect(pageCalls).toBeGreaterThan(0);
  });

  it("getRowModel without listener returns synchronously without subscribing", () => {
    const dTable = setup();
    const rows = dTable.getRowModel();
    expect(Array.isArray(rows.rows)).toBe(true);
  });

  it("column filter reduces rows reactively via getFilteredRowModel", async () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
    });

    let rowCount = dTable.getRowModel().rows.length;
    expect(rowCount).toBe(3);

    dTable.table.getColumn("name")?.setFilterValue("alice");
    rowCount = dTable.getRowModel().rows.length;
    expect(rowCount).toBe(1);
    expect(dTable.getRowModel().rows[0].original.name).toBe("Alice");
  });
});

describe("createDomphyTable.setOptions", () => {
  it("feeds new data and bumps version so reactive reads re-derive", () => {
    const dTable = setup();
    const before = dTable.version();

    dTable.setOptions((prev) => ({
      ...prev,
      data: [...people, { id: 4, name: "Dave", age: 51 }],
    }));

    expect(dTable.version()).toBe(before + 1);
    expect(dTable.getPageCount()).toBe(2); // 4 rows, pageSize 2
    dTable.table.setPageIndex(1);
    expect(dTable.getRowModel().rows.length).toBe(2); // 2 rows on page 2 now
  });

  it("clamps the page index when data shrinks (autoResetPageIndex)", async () => {
    const dTable = setup(); // 3 rows, pageSize 2 → 2 pages
    // Mount derivation: the first _autoResetPageIndex call only registers the
    // table (upstream behavior, so an initialState pageIndex survives mount).
    dTable.getRowModel();
    await flush();
    dTable.table.setPageIndex(1);

    dTable.setOptions((prev) => ({ ...prev, data: people.slice(0, 2) }));
    // The clamp runs inside the core row model's memo onChange (fires on the
    // first row-model read after the data identity changes) and is deferred
    // through table._queue's microtask — same lazy semantics as upstream.
    dTable.getRowModel();
    await flush();

    expect(dTable.table.getState().pagination.pageIndex).toBe(0);
    expect(dTable.getRowModel().rows.length).toBe(2);
  });

  it("does not bump version when the updater returns options unchanged", () => {
    const dTable = setup();
    const before = dTable.version();

    dTable.setOptions((prev) => prev);

    expect(dTable.version()).toBe(before);
  });

  it("raw object merges with previous options and keeps the adapter onStateChange", () => {
    const dTable = setup();
    const before = dTable.version();

    dTable.setOptions({ data: people.slice(0, 1) });

    expect(dTable.version()).toBe(before + 1);
    expect(dTable.table.options.columns).toBe(columns);
    expect(dTable.getRowModel().rows.length).toBe(1);

    // Adapter wrapper still applies state — sorting would be a no-op if
    // onStateChange was dropped by the raw object.
    dTable.table.getColumn("name")?.toggleSorting(false);
    expect(dTable.table.getState().sorting).toEqual([
      { id: "name", desc: false },
    ]);
  });

  it("function updater cannot replace the adapter onStateChange wrapper", () => {
    const dTable = setup();
    const hijack = vi.fn();

    dTable.setOptions((prev) => ({ ...prev, onStateChange: hijack }));
    dTable.table.getColumn("age")?.toggleSorting(false);

    expect(hijack).not.toHaveBeenCalled();
    expect(dTable.table.getState().sorting).toEqual([
      { id: "age", desc: false },
    ]);
  });
});

describe("createDomphyTable getRowId", () => {
  it("defaults row.id to the row index when getRowId is omitted", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });
    expect(dTable.table.getRowModel().rows.map((row) => row.id)).toEqual([
      "0",
      "1",
      "2",
    ]);
  });

  it("getRowId keys rows by the provided id across data reorder", () => {
    const dTable = createDomphyTable<Person>({
      data: people,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getRowId: (person) => String(person.id),
    });

    expect(dTable.table.getRowModel().rows.map((row) => row.id)).toEqual([
      "1",
      "2",
      "3",
    ]);

    dTable.setOptions((prev) => ({ ...prev, data: [...people].reverse() }));

    expect(dTable.table.getRowModel().rows.map((row) => row.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
    expect(dTable.table.getRow("2").original.name).toBe("Alice");
  });
});

describe("createDomphyTable destroy", () => {
  it("post-destroy table mutations do not warn about a disposed state", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dTable = setup();

    dTable.destroy();
    dTable.table.getColumn("age")?.toggleSorting(false);
    dTable.setOptions((prev) => ({ ...prev, data: people.slice(0, 1) }));
    await flush();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("createDomphyTable no-op state updates", () => {
  it("does not bump version when the updater returns the state unchanged", () => {
    const { version, setState } = setup();
    const before = version();

    // Identity updater: a real onStateChange dispatch, but nothing changed.
    setState((old) => old);

    expect(version()).toBe(before);
  });

  it("still notifies the user's onStateChange for a no-op update", () => {
    const onStateChange = vi.fn();
    const { setState } = setup({ onStateChange });

    setState((old) => old);

    // table-core invokes onStateChange unconditionally — the no-op skip only
    // covers the reactive version bump, not the user's handler.
    expect(onStateChange).toHaveBeenCalledTimes(1);
  });

  it("still bumps version for a real change after a no-op update", () => {
    const { table, version, setState } = setup();
    setState((old) => old);
    const before = version();

    table.nextPage();

    expect(version()).toBe(before + 1);
  });
});
