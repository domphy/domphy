import { describe, expect, it } from "vitest";
import type {
  ColumnDef,
  FilterFn,
  RowData,
  Table,
  TableOptionsResolved,
} from "../src/index";
import {
  createColumnHelper,
  createTable,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "../src/index";

interface Person {
  id: number;
  name: string;
  age: number;
  city: string;
}

const people: Person[] = [
  { id: 1, name: "Anna", age: 30, city: "Hanoi" },
  { id: 2, name: "Binh", age: 25, city: "Saigon" },
  { id: 3, name: "Chi", age: 35, city: "Hanoi" },
  { id: 4, name: "Dung", age: 28, city: "Danang" },
  { id: 5, name: "An", age: 22, city: "Saigon" },
  { id: 6, name: "Giang", age: 40, city: "Hanoi" },
];

const personColumns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "age", header: "Age" },
  { accessorKey: "city", header: "City" },
];

type BuildTableOptions<TData extends RowData> = Pick<
  TableOptionsResolved<TData>,
  "data" | "columns"
> &
  Partial<Omit<TableOptionsResolved<TData>, "data" | "columns">>;

// Vanilla (non-framework) usage: state is managed manually by piping
// onStateChange back into the table options.
function buildTable<TData extends RowData>(
  options: BuildTableOptions<TData>,
): Table<TData> {
  const table = createTable<TData>({
    state: {},
    onStateChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(table.getState()) : updater;
      table.setOptions((previous) => ({ ...previous, state: next }));
    },
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    ...options,
  });
  table.setOptions((previous) => ({ ...previous, state: table.initialState }));
  return table;
}

function getColumnValues<TValue>(
  table: Table<Person>,
  columnId: string,
): TValue[] {
  return table.getRowModel().rows.map((row) => row.getValue<TValue>(columnId));
}

describe("core row model", () => {
  it("creates one row per data item preserving original objects", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    const rows = table.getCoreRowModel().rows;
    expect(rows).toHaveLength(people.length);
    expect(rows.map((row) => row.original)).toEqual(people);
    expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("reads cell values through accessorKey", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    const firstRow = table.getRowModel().rows[0];
    expect(firstRow.getValue<string>("name")).toBe("Anna");
    const ageCell = firstRow
      .getAllCells()
      .find((cell) => cell.column.id === "age");
    if (!ageCell) throw new Error("age cell not found");
    expect(ageCell.getValue()).toBe(30);
  });

  it("reads cell values through accessorFn", () => {
    const table = buildTable<Person>({
      data: people,
      columns: [
        {
          id: "label",
          accessorFn: (person) => `${person.name} (${person.city})`,
        },
      ],
    });
    const rows = table.getRowModel().rows;
    expect(rows[0].getValue<string>("label")).toBe("Anna (Hanoi)");
    expect(rows[4].getValue<string>("label")).toBe("An (Saigon)");
  });

  it("builds header groups with group headers on top and leaves at the bottom", () => {
    const helper = createColumnHelper<Person>();
    const table = buildTable<Person>({
      data: people,
      columns: [
        helper.accessor("name", { header: "Name" }),
        helper.group({
          id: "details",
          header: "Details",
          columns: [
            helper.accessor("age", { header: "Age" }),
            helper.accessor("city", { header: "City" }),
          ],
        }),
      ],
    });

    const headerGroups = table.getHeaderGroups();
    expect(headerGroups).toHaveLength(2);

    const topHeaders = headerGroups[0].headers;
    const bottomHeaders = headerGroups[1].headers;
    expect(bottomHeaders.map((header) => header.column.id)).toEqual([
      "name",
      "age",
      "city",
    ]);

    const detailsHeader = topHeaders.find(
      (header) => header.column.id === "details",
    );
    if (!detailsHeader) throw new Error("details header not found");
    expect(detailsHeader.colSpan).toBe(2);
    expect(detailsHeader.isPlaceholder).toBe(false);

    const namePlaceholder = topHeaders.find(
      (header) => header.column.id === "name",
    );
    if (!namePlaceholder) throw new Error("name placeholder not found");
    expect(namePlaceholder.isPlaceholder).toBe(true);
  });

  it("columnHelper builds accessor, display and group columns", () => {
    const helper = createColumnHelper<Person>();
    const table = buildTable<Person>({
      data: people,
      columns: [
        helper.accessor("name", { header: "Name" }),
        helper.accessor((person) => person.age * 2, { id: "doubleAge" }),
        helper.display({ id: "actions" }),
        helper.group({
          id: "location",
          columns: [helper.accessor("city", {})],
        }),
      ],
    });

    expect(table.getAllLeafColumns().map((column) => column.id)).toEqual([
      "name",
      "doubleAge",
      "actions",
      "city",
    ]);

    const firstRow = table.getRowModel().rows[0];
    expect(firstRow.getValue<number>("doubleAge")).toBe(60);

    const actionsColumn = table.getColumn("actions");
    if (!actionsColumn) throw new Error("actions column not found");
    expect(actionsColumn.accessorFn).toBeUndefined();

    const locationColumn = table
      .getAllColumns()
      .find((column) => column.id === "location");
    if (!locationColumn) throw new Error("location column not found");
    expect(locationColumn.columns.map((column) => column.id)).toEqual(["city"]);
  });
});

describe("sorting", () => {
  function buildSortableTable(columns: ColumnDef<Person>[] = personColumns) {
    return buildTable<Person>({
      data: people,
      columns,
      getSortedRowModel: getSortedRowModel(),
    });
  }

  it("toggleSorting on a string column starts ascending", () => {
    const table = buildSortableTable();
    const nameColumn = table.getColumn("name");
    if (!nameColumn) throw new Error("name column not found");

    nameColumn.toggleSorting();
    expect(nameColumn.getIsSorted()).toBe("asc");
    expect(getColumnValues<string>(table, "name")).toEqual([
      "An",
      "Anna",
      "Binh",
      "Chi",
      "Dung",
      "Giang",
    ]);

    nameColumn.toggleSorting();
    expect(nameColumn.getIsSorted()).toBe("desc");
    expect(getColumnValues<string>(table, "name")).toEqual([
      "Giang",
      "Dung",
      "Chi",
      "Binh",
      "Anna",
      "An",
    ]);
  });

  it("toggleSorting on a number column starts descending by default", () => {
    const table = buildSortableTable();
    const ageColumn = table.getColumn("age");
    if (!ageColumn) throw new Error("age column not found");

    ageColumn.toggleSorting();
    expect(ageColumn.getIsSorted()).toBe("desc");
    expect(getColumnValues<number>(table, "age")).toEqual([
      40, 35, 30, 28, 25, 22,
    ]);
  });

  it("setSorting applies explicit sort state", () => {
    const table = buildSortableTable();
    table.setSorting([{ id: "age", desc: false }]);
    expect(getColumnValues<number>(table, "age")).toEqual([
      22, 25, 28, 30, 35, 40,
    ]);
  });

  it("supports multi-sort across two columns", () => {
    const table = buildSortableTable();
    table.setSorting([
      { id: "city", desc: false },
      { id: "age", desc: false },
    ]);
    expect(getColumnValues<number>(table, "age")).toEqual([
      28, 30, 35, 40, 22, 25,
    ]);

    // toggleSorting with multi=true appends instead of replacing.
    const table2 = buildSortableTable();
    const cityColumn = table2.getColumn("city");
    const ageColumn = table2.getColumn("age");
    if (!cityColumn || !ageColumn) throw new Error("columns not found");
    cityColumn.toggleSorting(false, true);
    ageColumn.toggleSorting(false, true);
    expect(table2.getState().sorting).toEqual([
      { id: "city", desc: false },
      { id: "age", desc: false },
    ]);
    expect(getColumnValues<number>(table2, "age")).toEqual([
      28, 30, 35, 40, 22, 25,
    ]);
  });

  it("uses built-in and custom sorting functions", () => {
    const builtIn = buildSortableTable([
      { accessorKey: "name", header: "Name" },
      { accessorKey: "age", header: "Age", sortingFn: "basic" },
      { accessorKey: "city", header: "City" },
    ]);
    builtIn.setSorting([{ id: "age", desc: false }]);
    expect(getColumnValues<number>(builtIn, "age")).toEqual([
      22, 25, 28, 30, 35, 40,
    ]);

    const custom = buildSortableTable([
      {
        accessorKey: "name",
        header: "Name",
        sortingFn: (rowA, rowB) =>
          rowA.original.name.length - rowB.original.name.length,
      },
      { accessorKey: "age", header: "Age" },
      { accessorKey: "city", header: "City" },
    ]);
    custom.setSorting([{ id: "name", desc: false }]);
    // Sort is stable, so equal-length names keep their original order.
    expect(getColumnValues<string>(custom, "name")).toEqual([
      "An",
      "Chi",
      "Anna",
      "Binh",
      "Dung",
      "Giang",
    ]);
  });
});

describe("filtering", () => {
  function buildFilterableTable(columns: ColumnDef<Person>[] = personColumns) {
    return buildTable<Person>({
      data: people,
      columns,
      getFilteredRowModel: getFilteredRowModel(),
    });
  }

  it("includesString filterFn matches case-insensitive substrings", () => {
    const table = buildFilterableTable([
      { accessorKey: "name", header: "Name" },
      { accessorKey: "age", header: "Age" },
      { accessorKey: "city", header: "City", filterFn: "includesString" },
    ]);
    const cityColumn = table.getColumn("city");
    if (!cityColumn) throw new Error("city column not found");

    cityColumn.setFilterValue("han");
    expect(getColumnValues<string>(table, "city")).toEqual([
      "Hanoi",
      "Hanoi",
      "Hanoi",
    ]);

    table.setColumnFilters([{ id: "city", value: "SAI" }]);
    expect(getColumnValues<string>(table, "name")).toEqual(["Binh", "An"]);
  });

  it("supports a custom filterFn", () => {
    const minimumAge: FilterFn<Person> = (row, columnId, filterValue: number) =>
      row.getValue<number>(columnId) >= filterValue;
    const table = buildFilterableTable([
      { accessorKey: "name", header: "Name" },
      { accessorKey: "age", header: "Age", filterFn: minimumAge },
      { accessorKey: "city", header: "City" },
    ]);
    const ageColumn = table.getColumn("age");
    if (!ageColumn) throw new Error("age column not found");

    ageColumn.setFilterValue(30);
    expect(getColumnValues<number>(table, "age")).toEqual([30, 35, 40]);
    expect(table.getPreFilteredRowModel().rows).toHaveLength(6);
  });

  it("global filter searches across all columns", () => {
    const table = buildFilterableTable();
    table.setGlobalFilter("anna");
    expect(getColumnValues<string>(table, "name")).toEqual(["Anna"]);

    table.setGlobalFilter("saigon");
    expect(getColumnValues<string>(table, "name")).toEqual(["Binh", "An"]);

    // Numbers are stringified by the default includesString global filter.
    table.setGlobalFilter("22");
    expect(getColumnValues<string>(table, "name")).toEqual(["An"]);

    table.setGlobalFilter(undefined);
    expect(table.getRowModel().rows).toHaveLength(6);
  });
});

describe("pagination", () => {
  function buildPaginatedTable() {
    return buildTable<Person>({
      data: people,
      columns: personColumns,
      getPaginationRowModel: getPaginationRowModel(),
    });
  }

  it("defaults to page size 10 on page 0", () => {
    const table = buildPaginatedTable();
    expect(table.getState().pagination).toEqual({ pageIndex: 0, pageSize: 10 });
    expect(table.getRowModel().rows).toHaveLength(6);
    expect(table.getPageCount()).toBe(1);
  });

  it("setPageSize splits rows into pages", () => {
    const table = buildPaginatedTable();
    table.setPageSize(2);
    expect(table.getPageCount()).toBe(3);
    expect(getColumnValues<string>(table, "name")).toEqual(["Anna", "Binh"]);
    expect(table.getCanPreviousPage()).toBe(false);
    expect(table.getCanNextPage()).toBe(true);
  });

  it("navigates with nextPage, previousPage and setPageIndex", () => {
    const table = buildPaginatedTable();
    table.setPageSize(2);

    table.nextPage();
    expect(table.getState().pagination.pageIndex).toBe(1);
    expect(getColumnValues<string>(table, "name")).toEqual(["Chi", "Dung"]);
    expect(table.getCanPreviousPage()).toBe(true);

    table.setPageIndex(2);
    expect(getColumnValues<string>(table, "name")).toEqual(["An", "Giang"]);
    expect(table.getCanNextPage()).toBe(false);

    table.previousPage();
    expect(table.getState().pagination.pageIndex).toBe(1);
  });
});

describe("row selection", () => {
  it("toggleSelected selects and deselects a single row", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    const firstRow = table.getRowModel().rows[0];

    firstRow.toggleSelected();
    expect(firstRow.getIsSelected()).toBe(true);
    expect(
      table.getSelectedRowModel().rows.map((row) => row.original.name),
    ).toEqual(["Anna"]);

    firstRow.toggleSelected();
    expect(firstRow.getIsSelected()).toBe(false);
    expect(table.getSelectedRowModel().rows).toHaveLength(0);
  });

  it("toggleAllRowsSelected selects every row", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    table.toggleAllRowsSelected(true);
    expect(table.getIsAllRowsSelected()).toBe(true);
    expect(table.getSelectedRowModel().rows).toHaveLength(6);

    table.toggleAllRowsSelected(false);
    expect(table.getIsAllRowsSelected()).toBe(false);
    expect(table.getSelectedRowModel().rows).toHaveLength(0);
  });

  it("enableRowSelection predicate restricts selectable rows", () => {
    const table = buildTable<Person>({
      data: people,
      columns: personColumns,
      enableRowSelection: (row) => row.original.age >= 25,
    });
    const rows = table.getRowModel().rows;
    const youngest = rows[4];
    expect(youngest.original.age).toBe(22);
    expect(youngest.getCanSelect()).toBe(false);

    youngest.toggleSelected();
    expect(youngest.getIsSelected()).toBe(false);

    table.toggleAllRowsSelected(true);
    expect(table.getSelectedRowModel().rows).toHaveLength(5);
    // getIsAllRowsSelected only considers selectable rows, so it is still
    // true even though the unselectable row stays unselected.
    expect(table.getIsAllRowsSelected()).toBe(true);
  });
});

describe("column visibility and ordering", () => {
  it("toggleVisibility hides a column from visible leaf columns and cells", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    const ageColumn = table.getColumn("age");
    if (!ageColumn) throw new Error("age column not found");

    ageColumn.toggleVisibility(false);
    expect(ageColumn.getIsVisible()).toBe(false);
    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual([
      "name",
      "city",
    ]);
    expect(
      table
        .getRowModel()
        .rows[0].getVisibleCells()
        .map((cell) => cell.column.id),
    ).toEqual(["name", "city"]);

    ageColumn.toggleVisibility(true);
    expect(table.getVisibleLeafColumns()).toHaveLength(3);
  });

  it("setColumnOrder reorders visible leaf columns", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    table.setColumnOrder(["city", "name", "age"]);
    expect(table.getVisibleLeafColumns().map((column) => column.id)).toEqual([
      "city",
      "name",
      "age",
    ]);
    expect(
      table
        .getRowModel()
        .rows[0].getVisibleCells()
        .map((cell) => cell.getValue()),
    ).toEqual(["Hanoi", "Anna", 30]);
  });
});

describe("grouping and expanding", () => {
  const groupableColumns: ColumnDef<Person>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "age", header: "Age", aggregationFn: "sum" },
    { accessorKey: "city", header: "City" },
  ];

  function buildGroupableTable() {
    return buildTable<Person>({
      data: people,
      columns: groupableColumns,
      getGroupedRowModel: getGroupedRowModel(),
      getExpandedRowModel: getExpandedRowModel(),
    });
  }

  it("setGrouping creates one group row per unique value with aggregated cells", () => {
    const table = buildGroupableTable();
    table.setGrouping(["city"]);

    const rows = table.getGroupedRowModel().rows;
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getValue<string>("city"))).toEqual([
      "Hanoi",
      "Saigon",
      "Danang",
    ]);
    expect(rows.map((row) => row.getIsGrouped())).toEqual([true, true, true]);
    expect(rows.map((row) => row.subRows.length)).toEqual([3, 2, 1]);

    // The sum aggregationFn rolls leaf values up into the group row.
    expect(rows[0].getValue<number>("age")).toBe(30 + 35 + 40);
    expect(rows[1].getValue<number>("age")).toBe(25 + 22);
  });

  it("expanding group rows flattens leaf rows into the row model", () => {
    const table = buildGroupableTable();
    table.setGrouping(["city"]);
    expect(table.getRowModel().rows).toHaveLength(3);

    table.toggleAllRowsExpanded(true);
    expect(table.getIsAllRowsExpanded()).toBe(true);
    expect(table.getRowModel().rows).toHaveLength(3 + 6);
  });

  it("expands hierarchical data through getSubRows", () => {
    interface TreePerson extends Person {
      children?: TreePerson[];
    }
    const tree: TreePerson[] = [
      {
        id: 1,
        name: "Anna",
        age: 30,
        city: "Hanoi",
        children: [
          { id: 2, name: "Binh", age: 25, city: "Saigon" },
          { id: 3, name: "Chi", age: 35, city: "Hanoi" },
        ],
      },
      {
        id: 4,
        name: "Dung",
        age: 28,
        city: "Danang",
        children: [{ id: 5, name: "An", age: 22, city: "Saigon" }],
      },
    ];
    const table = buildTable<TreePerson>({
      data: tree,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "age", header: "Age" },
      ],
      getSubRows: (row) => row.children,
      getExpandedRowModel: getExpandedRowModel(),
    });

    expect(table.getRowModel().rows).toHaveLength(2);
    const firstRow = table.getRowModel().rows[0];
    expect(firstRow.getCanExpand()).toBe(true);
    expect(firstRow.subRows).toHaveLength(2);

    firstRow.toggleExpanded();
    expect(firstRow.getIsExpanded()).toBe(true);
    expect(
      table.getRowModel().rows.map((row) => row.getValue<string>("name")),
    ).toEqual(["Anna", "Binh", "Chi", "Dung"]);

    table.toggleAllRowsExpanded(true);
    expect(table.getRowModel().rows).toHaveLength(5);
  });
});

describe("column pinning and sizing", () => {
  it("setColumnPinning splits columns into left, center and right", () => {
    const table = buildTable<Person>({ data: people, columns: personColumns });
    table.setColumnPinning({ left: ["city"], right: ["name"] });

    expect(table.getLeftLeafColumns().map((column) => column.id)).toEqual([
      "city",
    ]);
    expect(table.getRightLeafColumns().map((column) => column.id)).toEqual([
      "name",
    ]);
    expect(table.getCenterLeafColumns().map((column) => column.id)).toEqual([
      "age",
    ]);

    const cityColumn = table.getColumn("city");
    const ageColumn = table.getColumn("age");
    if (!cityColumn || !ageColumn) throw new Error("columns not found");
    expect(cityColumn.getIsPinned()).toBe("left");
    expect(ageColumn.getIsPinned()).toBe(false);
  });

  it("column sizing uses defaults, columnDef sizes and setColumnSizing", () => {
    const table = buildTable<Person>({
      data: people,
      columns: [
        { accessorKey: "name", header: "Name" },
        { accessorKey: "age", header: "Age", size: 80 },
        { accessorKey: "city", header: "City" },
      ],
    });
    const nameColumn = table.getColumn("name");
    const ageColumn = table.getColumn("age");
    if (!nameColumn || !ageColumn) throw new Error("columns not found");

    // Default size is 150.
    expect(nameColumn.getSize()).toBe(150);
    expect(ageColumn.getSize()).toBe(80);

    table.setColumnSizing({ name: 300 });
    expect(nameColumn.getSize()).toBe(300);
    expect(ageColumn.getSize()).toBe(80);

    table.resetColumnSizing();
    expect(nameColumn.getSize()).toBe(150);
  });
});

describe("faceting", () => {
  function buildFacetedTable() {
    return buildTable<Person>({
      data: people,
      columns: personColumns,
      getFilteredRowModel: getFilteredRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      getFacetedMinMaxValues: getFacetedMinMaxValues(),
    });
  }

  it("getFacetedRowModel exposes the rows used for faceting", () => {
    const table = buildFacetedTable();
    const cityColumn = table.getColumn("city");
    if (!cityColumn) throw new Error("city column not found");
    expect(cityColumn.getFacetedRowModel().rows).toHaveLength(6);
  });

  it("getFacetedUniqueValues counts occurrences per value", () => {
    const table = buildFacetedTable();
    const cityColumn = table.getColumn("city");
    if (!cityColumn) throw new Error("city column not found");

    const uniqueValues = cityColumn.getFacetedUniqueValues();
    expect(uniqueValues.size).toBe(3);
    expect(uniqueValues.get("Hanoi")).toBe(3);
    expect(uniqueValues.get("Saigon")).toBe(2);
    expect(uniqueValues.get("Danang")).toBe(1);
  });

  it("getFacetedMinMaxValues returns the value range", () => {
    const table = buildFacetedTable();
    const ageColumn = table.getColumn("age");
    if (!ageColumn) throw new Error("age column not found");

    const minMax = ageColumn.getFacetedMinMaxValues();
    if (!minMax) throw new Error("min/max values not computed");
    expect(minMax[0]).toBe(22);
    expect(minMax[1]).toBe(40);
  });
});
