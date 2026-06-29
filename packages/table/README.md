# @domphy/table

**[domphy.com](https://domphy.com)** · [Docs](https://domphy.com/docs/table/) · [npm](https://www.npmjs.com/package/@domphy/table)

Headless table logic for Domphy apps: sorting, filtering, pagination, row selection, grouping, expanding, column pinning, sizing, visibility, and faceting. Domphy owns the rendering — this package owns the table state.


## Install

```bash
npm install @domphy/table
```

`@domphy/core` is a peer dependency.

## Quick start — `createDomphyTable`

Import from the `/domphy` subpath to get a reactive handle that Domphy elements subscribe to:

```ts
import { createDomphyTable } from "@domphy/table/domphy"
import { createColumnHelper, getCoreRowModel, getSortedRowModel } from "@domphy/table"

const columnHelper = createColumnHelper<Person>()
const columns = [
  columnHelper.accessor("name", { header: "Name" }),
  columnHelper.accessor("age", { header: "Age" }),
]

const dTable = createDomphyTable({
  data: people,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})
```

Render with `version(l)` for coarse re-renders (whole table) or pass `l` directly to fine-grained reads:

```ts
// Coarse — re-render tbody when any table state changes
const App = {
  tbody: (l) => {
    dTable.version(l)
    return dTable.table.getRowModel().rows.map((row) => ({
      tr: row.getVisibleCells().map((cell) => ({
        td: String(cell.getValue() ?? ""),
        _key: cell.id,
      })),
      _key: row.id,
    }))
  },
}

// Fine-grained — only this button re-renders when page changes
const PrevButton = {
  button: "Previous",
  disabled: (l) => !dTable.getCanPreviousPage(l),
  onClick: () => dTable.table.previousPage(),
}
```

## DomphyTable handle

`createDomphyTable(options)` returns a `DomphyTable<TData>` handle:

| Method | Description |
|---|---|
| `table` | Raw table-core `Table` instance — all feature methods (setSorting, setColumnFilters, nextPage, …) |
| `version(l?)` | Reactive change counter — bumps on any state change |
| `state(l?)` | Full `TableState`, reactive with listener |
| `setState(updater)` | Direct state update |
| `destroy()` | Releases reactive state |
| `getRowModel(l?)` | Reactive row model |
| `getHeaderGroups(l?)` | Reactive header groups |
| `getAllLeafColumns(l?)` | All leaf columns, reactive |
| `getVisibleLeafColumns(l?)` | Visible leaf columns, reactive |
| `getIsAllColumnsVisible(l?)` | Reactive |
| `getIsSomeColumnsVisible(l?)` | Reactive |
| `getSelectedRowModel(l?)` | Reactive selected rows |
| `getIsAllRowsSelected(l?)` | Reactive |
| `getIsSomeRowsSelected(l?)` | Reactive |
| `getIsAllRowsExpanded(l?)` | Reactive |
| `getCanNextPage(l?)` | Reactive |
| `getCanPreviousPage(l?)` | Reactive |
| `getPageCount(l?)` | Reactive |

## Raw table-core (advanced)

Import directly from `@domphy/table` for the raw TanStack table-core API:

```ts
import { createTable, getCoreRowModel, createColumnHelper } from "@domphy/table"
```

All TanStack Table v8 APIs are available unchanged.

## What's included

- `createTable` / `createColumnHelper` — table instance and typed column defs
- Row models (opt-in, tree-shakeable): core, sorted, filtered, grouped, expanded, paginated, faceted
- Built-in `sortingFns`, `filterFns`, `aggregationFns`
- Per-feature APIs: column filtering, global filtering, sorting, pagination, row selection, expanding, grouping, column ordering/pinning/sizing/visibility, faceting

## Documentation

- [Table docs](https://domphy.com/docs/table/)

## License

MIT — see [LICENSE](./LICENSE).
