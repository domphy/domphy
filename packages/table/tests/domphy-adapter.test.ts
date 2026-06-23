import { describe, expect, it, vi } from "vitest";
import { createDomphyTable } from "../src/domphy/index";
import type { TableState } from "../src/index";
import {
  createColumnHelper,
  getCoreRowModel,
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
