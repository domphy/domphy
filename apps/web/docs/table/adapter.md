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
| `table` | The full table-core `Table` instance — every header group, row model, and feature method. |
| `version(l)` | Reactive change counter. Read it (with the listener) anywhere you render from the instance; it bumps on every state change. |
| `state(l)` | The current `TableState`, reactive when a listener is passed. |
| `setState(updater)` | Forwards to `table.setState`. |
| `destroy()` | Releases the version state's listeners. |

## Why a version counter

A table's rendered output — `getRowModel().rows`, header sort markers, the page indicator — depends on essentially all of the table state. One coarse `version` signal that bumps on any change is the right granularity: read `version(l)` once at the top of the region that renders from the instance, and the whole region reconciles. Domphy patches the DOM in place, so re-deriving rows is cheap and keyed rows keep their nodes.

For controls that depend on a single slice (e.g. a page-size selector), you can read `state(l).pagination` instead to avoid re-rendering on unrelated changes.

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
