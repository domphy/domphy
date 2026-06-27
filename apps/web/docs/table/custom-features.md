---
title: "Custom Features & Plugins"
description: "Extend @domphy/table with custom table features, plugin factories, and row-level state."
---

# Custom Features & Plugins

`@domphy/table` supports custom features — extend the table with your own state, reducers, and methods following the same plugin architecture as built-in features (sorting, filtering, etc.).

## Custom feature structure

A custom feature is a plain object with hooks that integrate with the table lifecycle:

```ts
import type { TableFeature, Table, RowData } from "@domphy/table"

interface HighlightFeature {
  highlightedRows: Set<string>
  setHighlightedRows: (ids: string[]) => void
  toggleHighlight: (id: string) => void
  getIsHighlighted: (id: string) => boolean
}

const HighlightFeature: TableFeature = {
  getInitialState: (state) => ({
    ...state,
    highlightedRows: new Set<string>(),
  }),

  getDefaultOptions: (table) => ({
    onHighlightChange: (updater) => {
      const newSet = typeof updater === "function"
        ? updater(table.getState().highlightedRows)
        : updater
      table.options.onHighlightChange?.(newSet)
    },
  }),

  createTable: (table) => {
    table.setHighlightedRows = (ids) => {
      table.options.onHighlightChange(new Set(ids))
    }

    table.toggleHighlight = (id) => {
      table.options.onHighlightChange((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
  },

  createRow: (row, table) => {
    row.getIsHighlighted = () => table.getState().highlightedRows.has(row.id)
  },
}
```

## Registering a custom feature

Pass features to `createDomphyTable`:

```ts
import { createDomphyTable } from "@domphy/table/domphy"
import { toState } from "@domphy/core"

const highlighted = toState<Set<string>>(new Set())

const table = createDomphyTable({
  _features: [HighlightFeature],
  data: () => rows,
  columns,
  state: {
    highlightedRows: highlighted.get(),
  },
  onHighlightChange: (newSet) => highlighted.set(newSet),
})

// Now table has .toggleHighlight() and rows have .getIsHighlighted()
table.toggleHighlight("row-1")
```

## Row-level state

Custom state per row (stored in the table, not in the row data):

```ts
const ExpandedNotesFeature: TableFeature = {
  getInitialState: (state) => ({
    ...state,
    expandedNotes: {} as Record<string, string>,
  }),

  createTable: (table) => {
    table.setNote = (rowId: string, note: string) => {
      table.setState((prev) => ({
        ...prev,
        expandedNotes: { ...prev.expandedNotes, [rowId]: note },
      }))
    }

    table.getNote = (rowId: string): string => {
      return table.getState().expandedNotes[rowId] ?? ""
    }
  },

  createRow: (row, table) => {
    row.getNote = () => table.getNote(row.id)
    row.setNote = (note: string) => table.setNote(row.id, note)
  },
}
```

## Column-level feature

Custom column options and methods:

```ts
const TooltipFeature: TableFeature = {
  createColumn: (column) => {
    column.getTooltip = () => column.columnDef.meta?.tooltip ?? ""
    column.hasTooltip = () => !!column.columnDef.meta?.tooltip
  },
}

// Usage in column definition:
columnHelper.accessor("status", {
  header: "Status",
  meta: { tooltip: "Current approval status" },
})

// Render with tooltip:
const HeaderCell = (header: Header<any, unknown>) => ({
  th: [
    { span: String(header.column.columnDef.header ?? "") },
    header.column.hasTooltip()
      ? { span: header.column.getTooltip(), $: [tooltip()] }
      : null,
  ].filter(Boolean),
})
```

## TypeScript: augmenting table types

Extend the `@domphy/table` type declarations to get full IntelliSense for custom features:

```ts
// types/table-extensions.d.ts
import "@domphy/table"

declare module "@domphy/table" {
  interface TableMeta<TData extends RowData> {
    updateData?: (rowIndex: number, columnId: string, value: unknown) => void
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    tooltip?: string
    editable?: boolean
  }

  interface TableState {
    highlightedRows: Set<string>
    expandedNotes: Record<string, string>
  }

  interface Table<TData extends RowData> {
    toggleHighlight: (id: string) => void
    setHighlightedRows: (ids: string[]) => void
    getNote: (rowId: string) => string
    setNote: (rowId: string, note: string) => void
  }

  interface Row<TData extends RowData> {
    getIsHighlighted: () => boolean
    getNote: () => string
    setNote: (note: string) => void
  }
}
```

## Editable cells plugin

A common plugin pattern — make cells editable inline:

```ts
const EditableCellFeature: TableFeature = {
  createTable: (table) => {
    table.updateCellData = (rowIndex: number, columnId: string, value: unknown) => {
      const updateFn = table.options.meta?.updateData
      if (updateFn) updateFn(rowIndex, columnId, value)
    }
  },
}

// In the data-source:
const tableData = toState(initialRows)

const table = createDomphyTable({
  _features: [EditableCellFeature],
  data: () => tableData.get(),
  columns: [
    columnHelper.accessor("name", {
      header: "Name",
      cell: (info) => ({
        input: null,
        type: "text",
        value: String(info.getValue() ?? ""),
        onBlur: (e: FocusEvent) => {
          info.table.updateCellData(
            info.row.index,
            info.column.id,
            (e.target as HTMLInputElement).value
          )
        },
      }),
      meta: { editable: true },
    }),
  ],
  meta: {
    updateData: (rowIndex, columnId, value) => {
      tableData.set(tableData.get().map((row, i) =>
        i === rowIndex ? { ...row, [columnId]: value } : row
      ))
    },
  },
})
```
