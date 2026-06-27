<script setup lang="ts">
import Basic from "../demos/table/basic.ts?raw"
</script>

# Domphy Adapter

The [bridge pattern](./) — a `tableVersion` counter bumped from `onStateChange` — is the same wiring in every table. `@domphy/table/domphy` packages it once: `createDomphyTable` owns the controlled-state loop and exposes a reactive `version` you read to re-render.

```bash
npm install @domphy/table @domphy/core
```

`@domphy/core` is a **peer dependency** of the adapter, so the main `@domphy/table` entry stays a dependency-free, byte-identical port. Import from the `/domphy` subpath:

```ts
import { createDomphyTable } from "@domphy/table/domphy"
```

## createDomphyTable

`createDomphyTable(options)` takes the same options as `createTable`, but fills in `state`, `onStateChange`, and `renderFallbackValue` for you and wires them to Domphy reactivity. It returns the full table instance plus a reactive `version`.

<CodeEditor :code="Basic" />

```ts
import { createColumnHelper, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from "@domphy/table"
import { createDomphyTable } from "@domphy/table/domphy"
import { table as tableUI } from "@domphy/ui"

const { table, version, destroy } = createDomphyTable<Person>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 5 } },
})

const App: DomphyElement<"table"> = {
    table: (l) => {
        version(l) // re-render on any sort / filter / pagination / selection change
        return [
            {
                thead: table.getHeaderGroups().map((group) => ({
                    tr: group.headers.map((header) => ({
                        th: String(header.column.columnDef.header),
                        onClick: header.column.getToggleSortingHandler(),
                        _key: header.id,
                    })),
                    _key: group.id,
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

## Return value

| Member | Description |
| --- | --- |
| `table` | The raw table-core `Table` instance — every feature method lives here. |
| `version(l)` | Reactive change counter. Bumps on every table state change. |
| `state(l)` | The current `TableState`, reactive when a listener is passed. |
| `setState(updater)` | Forwards to `table.setState`. |
| `destroy()` | Releases the version state's listeners. |
| `getRowModel(l?)` | Rows after all active row models (sort, filter, pagination, grouping). |
| `getHeaderGroups(l?)` | Header groups for `<thead>`. |
| `getAllLeafColumns(l?)` | All leaf columns regardless of visibility. |
| `getVisibleLeafColumns(l?)` | Visible leaf columns only. |
| `getIsAllColumnsVisible(l?)` | `true` when every leaf column is visible. |
| `getIsSomeColumnsVisible(l?)` | `true` when at least one leaf column is visible. |
| `getSelectedRowModel(l?)` | Selected rows as a row model (requires `enableRowSelection`). |
| `getIsAllRowsSelected(l?)` | `true` when all filtered rows are selected. |
| `getIsSomeRowsSelected(l?)` | `true` when some (not all) filtered rows are selected. |
| `getIsAllRowsExpanded(l?)` | `true` when all expandable rows are open. |
| `getCanNextPage(l?)` | `true` when a next page exists (requires `getPaginationRowModel`). |
| `getCanPreviousPage(l?)` | `true` when a previous page exists. |
| `getPageCount(l?)` | Total pages after filtering. |

## Two ways to react

**Coarse — one `version(l)` subscription per region:** read `version(l)` once at the top of a render function; everything derived from the table in that function re-runs together. This is the simplest pattern and matches the live example above.

```ts
table: (l) => {
    version(l)   // one subscription; re-runs on any change
    return [
        { thead: table.getHeaderGroups().map(...) },
        { tbody: table.getRowModel().rows.map(...) },
    ]
},
```

**Fine — per-expression subscriptions:** pass the listener directly to a convenience read method. The subscription is scoped to that expression, so only that element re-renders when the value changes. Useful for buttons or indicators outside the main table body.

```ts
{
    button: "Next",
    disabled: (l) => !dTable.getCanNextPage(l),
    onClick: () => dTable.table.nextPage(),
}
```

```ts
{ span: (l) => `Page ${dTable.state(l).pagination.pageIndex + 1} of ${dTable.getPageCount(l)}` }
```

Because all these methods subscribe to the same version counter, the granularity is identical — only the scope of the re-render differs.

## Cleanup

Release the version state when the table's subtree unmounts:

```ts
{
    table: (l) => { version(l); return [...] },
    $: [tableUI()],
    _onRemove: () => destroy(),
}
```

## When to use the bridge directly

Use the raw [bridge pattern](./) when you need fully-controlled state living in your own model, or per-slice signals instead of one counter. The adapter is built on that exact pattern.

## Cleanup

`version` is a Domphy state; release it when the table's subtree unmounts:

```ts
{
    table: (l) => { version(l); return [...] },
    $: [tableUI()],
    _onRemove: () => destroy(),
}
```

## When to use the bridge directly

Use the raw [bridge pattern](./) when you need fully-controlled state living in your own model, or per-slice signals instead of one counter. The adapter is built on that exact pattern.
