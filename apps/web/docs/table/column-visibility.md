---
title: "Column Visibility & Ordering"
description: "Show/hide columns with user-controlled visibility, persist column preferences, and reorder columns."
---

# Column Visibility & Ordering

## Column visibility

Enable column visibility — users can show/hide columns:

```ts
import { createDomphyTable } from "@domphy/table/domphy"
import { toState } from "@domphy/core"

const columnVisibility = toState<Record<string, boolean>>({})

const table = createDomphyTable({
  data: () => rows,
  columns,
  state: { columnVisibility: columnVisibility.get() },
  onColumnVisibilityChange: (updater) => {
    columnVisibility.set(
      typeof updater === "function"
        ? updater(columnVisibility.get())
        : updater
    )
  },
  enableHiding: true,
})
```

## Column visibility toggle UI

```ts
const ColumnToggle = {
  div: [
    { h4: "Columns" },
    {
      div: (l) => table.getAllLeafColumns(l).map((col) => ({
        _key: col.id,
        label: [
          {
            input: null,
            type: "checkbox",
            checked: (l) => col.getIsVisible(),
            disabled: !col.getCanHide(),
            onChange: () => col.toggleVisibility(),
          },
          { span: String(col.columnDef.header ?? col.id) },
        ],
      })),
    },
  ],
}
```

`col.getCanHide()` returns `false` for columns with `enableHiding: false` — prevent critical columns from being hidden.

## Pin certain columns as always visible

```ts
const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    enableHiding: false,   // cannot be hidden
  }),
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("status", {
    header: "Status",
  }),
]
```

## Column ordering

Reorder columns programmatically or via drag-and-drop:

```ts
import { toState } from "@domphy/core"

const columnOrder = toState<string[]>([])

const table = createDomphyTable({
  data: () => rows,
  columns,
  state: { columnOrder: columnOrder.get() },
  onColumnOrderChange: (updater) => {
    columnOrder.set(
      typeof updater === "function"
        ? updater(columnOrder.get())
        : updater
    )
  },
})

// Move a column
function moveColumn(fromId: string, toId: string) {
  table.table.setColumnOrder((old) => {
    const order = old.length
      ? [...old]
      : table.getAllLeafColumns().map(c => c.id)

    const from = order.indexOf(fromId)
    const to = order.indexOf(toId)
    if (from === -1 || to === -1) return old

    const next = [...order]
    next.splice(from, 1)
    next.splice(to, 0, fromId)
    return next
  })
}
```

## Column ordering with drag and drop

Combine with `@domphy/dnd` for drag-to-reorder headers:

```ts
import { dragDrop } from "@domphy/dnd"
import { toState } from "@domphy/core"

const headerOrder = toState<string[]>([])

const HeaderRow = {
  tr: (l) => {
    const headers = table.getHeaderGroups(l)[0]?.headers ?? []
    return headers.map((header) => ({
      th: String(header.column.columnDef.header ?? ""),
      _key: header.id,
      style: { cursor: "grab" },
    }))
  },
  $: [dragDrop(headerOrder, {
    group: "column-headers",
    onSort: (order) => table.table.setColumnOrder(order),
  })],
}
```

## Persisting column state

Save column visibility and order to localStorage:

```ts
const STORAGE_KEY = "table-column-state"

interface ColumnState {
  visibility: Record<string, boolean>
  order: string[]
}

function loadColumnState(): ColumnState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") ?? { visibility: {}, order: [] }
  } catch {
    return { visibility: {}, order: [] }
  }
}

function saveColumnState(state: ColumnState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const saved = loadColumnState()
const columnVisibility = toState(saved.visibility)
const columnOrder = toState(saved.order)

// Persist on change
columnVisibility.subscribe((v) => saveColumnState({ visibility: v, order: columnOrder.get() }))
columnOrder.subscribe((o) => saveColumnState({ visibility: columnVisibility.get(), order: o }))
```

## "Show all" / "Hide all" buttons

```ts
const ShowAllButton = {
  button: "Show all",
  onClick: () => table.table.resetColumnVisibility(),
}

const HideButton = (columnId: string) => ({
  button: "Hide",
  onClick: () => table.table.getColumn(columnId)?.toggleVisibility(false),
})
```

## Visibility API

| Method | Description |
|--------|-------------|
| `col.getIsVisible()` | `true` if column is visible |
| `col.getCanHide()` | `false` if `enableHiding: false` |
| `col.toggleVisibility(value?)` | Toggle or set visibility |
| `table.getVisibleLeafColumns(l)` | All visible leaf columns |
| `table.getIsAllColumnsVisible(l)` | `true` if all columns visible |
| `table.getIsSomeColumnsVisible(l)` | `true` if some columns visible |
| `table.toggleAllColumnsVisible()` | Toggle all |
| `table.resetColumnVisibility()` | Reset to initial state |
| `table.setColumnOrder(updater)` | Set column order |
| `table.resetColumnOrder()` | Reset to initial order |
