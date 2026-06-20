# @domphy/table

Headless table logic for Domphy apps: sorting, filtering, pagination, row selection, grouping, expanding, column pinning, sizing, visibility, and faceting. Domphy owns the rendering — this package owns the table state.

This package is a 1-1 port of [`@tanstack/table-core`](https://github.com/TanStack/table/tree/main/packages/table-core) v8.21.3 (MIT, © Tanner Linsley). The source is kept byte-identical to upstream so future versions can be diffed and merged directly. All credit for the design and implementation goes to the TanStack Table team.

## Install

```bash
npm install @domphy/table
```

## Quick Example

```ts
import { createTable, getCoreRowModel, getSortedRowModel, createColumnHelper } from "@domphy/table"
import { toState } from "@domphy/core"

const columnHelper = createColumnHelper<Person>()
const columns = [
    columnHelper.accessor("name", { header: "Name" }),
    columnHelper.accessor("age", { header: "Age" }),
]

const tableVersion = toState(0)

const table = createTable({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {},
    onStateChange: (updater) => {
        const next = typeof updater === "function" ? updater(table.getState()) : updater
        table.setOptions((prev) => ({ ...prev, state: next }))
        tableVersion.set(tableVersion.get() + 1)
    },
    renderFallbackValue: null,
})
table.setOptions((prev) => ({ ...prev, state: table.initialState }))
```

Render with plain Domphy elements — touch `tableVersion` to re-render on any table state change:

```ts
const App = {
    tbody: (l) => {
        tableVersion.get(l)
        return table.getRowModel().rows.map((row) => ({
            tr: row.getVisibleCells().map((cell) => ({
                td: String(cell.getValue() ?? ""),
                _key: cell.id,
            })),
            _key: row.id,
        }))
    },
}
```

## What It Includes

- `createTable` / `createColumnHelper` — table instance and typed column defs
- Row models (opt-in, tree-shakeable): core, sorted, filtered, grouped, expanded, paginated, faceted
- Built-in `sortingFns`, `filterFns`, `aggregationFns`
- Per-feature APIs: column filtering, global filtering, sorting, pagination, row selection, expanding, grouping, column ordering/pinning/sizing/visibility, faceting

## Documentation

- [Table docs](https://domphy.com/docs/table/)
- The API is identical to [TanStack Table v8](https://tanstack.com/table/v8/docs) — its reference applies as-is.

## License

MIT — see [LICENSE](./LICENSE). Contains code from TanStack Table, also MIT.
