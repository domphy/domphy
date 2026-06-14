# Columns & Row Models

Column defs tell the table how to extract values from your data and what to show in headers, cells, and footers. Row models compute the rows the table displays — each one is opt-in and tree-shakeable.

## Column Defs With `createColumnHelper`

`createColumnHelper<TData>()` returns a typed builder with three methods:

```ts
import { createColumnHelper } from "@domphy/table"

type Person = {
    firstName: string
    lastName: string
    age: number
    visits: number
}

const helper = createColumnHelper<Person>()

const columns = [
    // accessor by key — value type is inferred from the data shape
    helper.accessor("firstName", {
        header: "First Name",
    }),

    // accessor by function — derive a value; an explicit id is required
    helper.accessor((row) => `${row.firstName} ${row.lastName}`, {
        id: "fullName",
        header: "Full Name",
    }),

    // display column — no data value (actions, checkboxes, row numbers)
    helper.display({
        id: "actions",
        header: "Actions",
    }),

    // group column — a header spanning child columns
    helper.group({
        header: "Stats",
        columns: [
            helper.accessor("age", { header: "Age" }),
            helper.accessor("visits", { header: "Visits" }),
        ],
    }),
]
```

The helper is purely a typing convenience — plain objects with `accessorKey` / `accessorFn` work identically.

## Header, Cell, And Footer Defs

Each column def can carry `header`, `cell`, and `footer`. Each accepts a string or a function receiving a context object:

```ts
helper.accessor("age", {
    header: "Age",
    cell: (info) => `${info.getValue()} years`,
    footer: (info) => info.column.id,
})
```

The cell context exposes `getValue()`, `row`, `column`, and `table`. Because Domphy is headless-native, there is no `flexRender` step — a cell def can simply return a string, or you can skip cell defs entirely and read `cell.getValue()` yourself when building elements.

## Row Models Are Opt-In

`getCoreRowModel()` is the only required row model — it maps raw `data` to rows. Everything else is a separate factory you pass only when you use the feature:

| Row model | Enables |
|---|---|
| `getCoreRowModel()` | **Required.** Base rows from `data`. |
| `getSortedRowModel()` | Sorting. |
| `getFilteredRowModel()` | Column filters and global filtering. |
| `getPaginationRowModel()` | Page slicing. |
| `getGroupedRowModel()` | Grouping and aggregation. |
| `getExpandedRowModel()` | Expanding and sub-rows. |
| `getFacetedRowModel()` | Per-column faceting base. |
| `getFacetedUniqueValues()` | Unique value counts for filter UIs. |
| `getFacetedMinMaxValues()` | Min/max range for range filter UIs. |

```ts
import {
    createTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
} from "@domphy/table"

const table = createTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // ...bridge options from the overview
})
```

If a row model is missing, the feature's state is still tracked but rows pass through unprocessed — sorting state changes, but rows do not reorder.

## Accessing Data

The instance computes everything; you read it in a render function. The traversal is always the same:

- `table.getHeaderGroups()` → header rows; each group has `headers`, each header has `column.columnDef.header`, `colSpan`, `isPlaceholder`
- `table.getRowModel().rows` → final rows after all enabled row models
- `row.getVisibleCells()` → cells in visible-column order; `cell.getValue()` returns the accessor value

```ts
const App: DomphyElement<"table"> = {
    table: (l) => {
        tableVersion.get(l)
        return [
            {
                thead: table.getHeaderGroups().map((headerGroup) => ({
                    tr: headerGroup.headers.map((header) => ({
                        th: header.isPlaceholder ? "" : String(header.column.columnDef.header),
                        colSpan: header.colSpan,
                        _key: header.id,
                    })),
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
        ]
    },
    $: [tableUI()],
}
```

In Domphy these map to plain element objects — no render-prop indirection. If a column has a `cell` function returning a string, call it with `cell.getContext()`; otherwise `cell.getValue()` is all you need. Use `header.id`, `row.id`, and `cell.id` as `_key` so reconciliation stays stable across sorts and filters.
