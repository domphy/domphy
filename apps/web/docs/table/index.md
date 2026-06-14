<script setup lang="ts">
import CodeEditor from "../editor/index.vue"
import Basic from "../demos/table/basic.ts?raw"
</script>

# Table

`@domphy/table` provides headless table logic for Domphy apps: sorting, filtering, pagination, row selection, grouping, expanding, pinning, column sizing, and faceting.

It is a **1-1 port of [`@tanstack/table-core`](https://github.com/TanStack/table/tree/main/packages/table-core) v8.21.3** (MIT, © Tanner Linsley and the TanStack team). The source is kept byte-identical to upstream, so the entire [TanStack Table v8 reference](https://tanstack.com/table/v8/docs) applies as-is, and future upstream versions can be diffed and merged directly.

Like the rest of Domphy, it is framework-agnostic and has zero dependencies — the bridge to the UI is plain `toState`.

## Install

::: code-group
```bash [NPM]
npm install @domphy/table
```
```html [CDN]
<script src="https://unpkg.com/@domphy/table/dist/table.global.js"></script>
```
:::

The CDN bundle exposes `Domphy.table` with all exports.

## Live Example

<CodeEditor :code="Basic" />

## Core Concepts

- **`createTable`** — builds the table instance from your `data`, `columns`, row models, and state. The instance is the single API surface: header groups, row models, and every feature method hang off it.
- **Column defs** — plain objects describing how to extract values (`accessorKey` / `accessorFn`), what to render in headers/cells/footers, and per-column feature options. `createColumnHelper` gives you a typed builder.
- **Row models are opt-in** — only `getCoreRowModel()` is required. Sorting, filtering, pagination, grouping, expanding, and faceting each ship as a separate `get*RowModel()` factory you pass in explicitly, so unused features tree-shake away.
- **Headless** — `@domphy/table` computes *what* to display; Domphy owns *how*. You map header groups and rows straight into plain element objects.

## The Bridge Pattern

`@domphy/table` is state-driven: every interaction (sort click, filter input, page change) funnels through `onStateChange`. The bridge is one `toState` counter that bumps whenever table state changes — the UI reads it and re-renders from the instance:

```ts
import { createTable, getCoreRowModel, getSortedRowModel } from "@domphy/table"
import { toState } from "@domphy/core"

const tableVersion = toState(0)

const table = createTable({
    data,
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

The UI touches `tableVersion` reactively, then reads everything else directly from the instance:

```ts
import { table as tableUI } from "@domphy/ui"

const App: DomphyElement<"table"> = {
    table: (l) => {
        tableVersion.get(l)
        return [
            { thead: table.getHeaderGroups().map((headerGroup) => ({ tr: ..., _key: headerGroup.id })) },
            { tbody: table.getRowModel().rows.map((row) => ({ tr: ..., _key: row.id })) },
        ]
    },
    $: [tableUI()],
}
```

Note the import alias: the `table()` patch from `@domphy/ui` is imported as `tableUI` because `table` is taken by the instance. The docs use this aliasing throughout.

## What To Read Next

1. [Columns & Row Models](./columns) for column defs, `createColumnHelper`, and reading data out of the instance
2. [Sorting & Filtering](./sorting-filtering) for sort toggling, column filters, and global filtering
3. [Pagination & Selection](./pagination-selection) for page controls and row selection with checkboxes
4. [Advanced Features](./advanced) for grouping, expanding, visibility, ordering, pinning, sizing, and faceting
5. [API Reference](./api) for the full export list
