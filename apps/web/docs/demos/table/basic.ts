import { type DomphyElement, toState } from "@domphy/core";
import {
  createColumnHelper,
  createTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from "@domphy/table";
import { themeSpacing } from "@domphy/theme";
import { button, table as tableUI } from "@domphy/ui";

type Person = {
  id: number;
  name: string;
  age: number;
  city: string;
};

const people: Person[] = [
  { id: 1, name: "Alice Johnson", age: 32, city: "Hanoi" },
  { id: 2, name: "Bob Smith", age: 45, city: "Tokyo" },
  { id: 3, name: "Carol Nguyen", age: 28, city: "Da Nang" },
  { id: 4, name: "David Lee", age: 51, city: "Seoul" },
  { id: 5, name: "Emma Brown", age: 24, city: "London" },
  { id: 6, name: "Frank Tran", age: 37, city: "Saigon" },
  { id: 7, name: "Grace Kim", age: 29, city: "Busan" },
  { id: 8, name: "Henry Davis", age: 42, city: "New York" },
  { id: 9, name: "Iris Pham", age: 33, city: "Hue" },
  { id: 10, name: "Jack Wilson", age: 26, city: "Sydney" },
  { id: 11, name: "Kara Hoang", age: 39, city: "Can Tho" },
  { id: 12, name: "Liam Garcia", age: 47, city: "Madrid" },
];

const columnHelper = createColumnHelper<Person>();

const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("age", { header: "Age" }),
  columnHelper.accessor("city", { header: "City" }),
];

// --- Vanilla wiring: bump a version state on every table state change ---
const tableVersion = toState(0);

const table = createTable({
  data: people,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  state: {},
  onStateChange: (updater) => {
    const next =
      typeof updater === "function" ? updater(table.getState()) : updater;
    table.setOptions((prev) => ({ ...prev, state: next }));
    tableVersion.set(tableVersion.get() + 1);
  },
  renderFallbackValue: null,
});

const initialSorting: SortingState = [];

table.setOptions((prev) => ({
  ...prev,
  state: {
    ...table.initialState,
    sorting: initialSorting,
    pagination: { pageIndex: 0, pageSize: 5 },
  },
}));

// --- UI ---
const App: DomphyElement<"div"> = {
  div: [
    {
      // Reading tableVersion first makes the whole table re-render on any change.
      table: (l) => {
        tableVersion.get(l);
        return [
          {
            thead: table.getHeaderGroups().map((headerGroup) => ({
              tr: headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const marker =
                  sorted === "asc" ? " ▲" : sorted === "desc" ? " ▼" : "";
                return {
                  th: `${String(header.column.columnDef.header)}${marker}`,
                  onClick: (e) => {
                    const handler = header.column.getToggleSortingHandler();
                    if (handler) handler(e);
                  },
                  style: {
                    cursor: "pointer",
                    userSelect: "none",
                  },
                  _key: header.id,
                };
              }),
              _key: headerGroup.id,
            })),
          },
          {
            tbody: table.getRowModel().rows.map((row) => ({
              tr: row.getVisibleCells().map((cell) => ({
                td: String(cell.getValue() ?? ""),
                _key: cell.id,
              })),
              _key: row.id,
            })),
          },
        ];
      },
      $: [tableUI()],
    },
    {
      div: [
        {
          button: "Prev",
          $: [button()],
          ariaDisabled: (l) => {
            tableVersion.get(l);
            return !table.getCanPreviousPage();
          },
          onClick: () => table.previousPage(),
        },
        {
          span: (l) => {
            tableVersion.get(l);
            return `Page ${table.getState().pagination.pageIndex + 1} of ${table.getPageCount()}`;
          },
        },
        {
          button: "Next",
          $: [button()],
          ariaDisabled: (l) => {
            tableVersion.get(l);
            return !table.getCanNextPage();
          },
          onClick: () => table.nextPage(),
        },
      ],
      style: {
        display: "flex",
        gap: themeSpacing(2),
        alignItems: "center",
      },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
  },
};

export default App;
