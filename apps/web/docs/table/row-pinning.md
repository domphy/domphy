---
title: "Row Pinning & Sticky Rows"
description: "Pin rows to the top or bottom of the table — for summaries, totals, and sticky header rows."
---

# Row Pinning & Sticky Rows

## Basic row pinning

Pin specific rows to the top or bottom using `setRowPinning`:

```ts
import { createDomphyTable } from "@domphy/table/domphy"

const table = createDomphyTable({
  data: rows,
  columns,
  enableRowPinning: true,
  keepPinnedRows: true,   // keep pinned rows visible even when filtered out
})

// Pin a row to the top
table.getRow("row-id").pin("top")

// Pin to bottom
table.getRow("summary-row").pin("bottom")

// Unpin
table.getRow("row-id").pin(false)
```

## Rendering pinned rows

Separate the pinned and non-pinned rows in the render:

```ts
const Table = {
  table: [
    // Pinned top rows — sticky
    {
      tbody: (l) => table.getTopRows(l).map((row) => ({
        tr: row.getVisibleCells().map((cell) => ({
          td: String(cell.getValue() ?? ""),
          _key: cell.id,
        })),
        _key: row.id,
        style: {
          position: "sticky",
          top: "40px",   // offset below table header
          background: "var(--neutral-1)",
          zIndex: 1,
        },
      })),
    },
    // Regular (non-pinned) rows
    {
      tbody: (l) => table.getCenterRows(l).map((row) => ({
        tr: row.getVisibleCells().map((cell) => ({
          td: String(cell.getValue() ?? ""),
          _key: cell.id,
        })),
        _key: row.id,
      })),
    },
    // Pinned bottom rows — sticky
    {
      tbody: (l) => table.getBottomRows(l).map((row) => ({
        tr: row.getVisibleCells().map((cell) => ({
          td: String(cell.getValue() ?? ""),
          _key: cell.id,
        })),
        _key: row.id,
        style: {
          position: "sticky",
          bottom: 0,
          background: "var(--neutral-1)",
        },
      })),
    },
  ],
}
```

## Summary / totals row

Pin a computed totals row to the bottom without adding it to the data:

```ts
import { createDomphyTable } from "@domphy/table/domphy"
import { toState } from "@domphy/core"

interface SalesRow { product: string; qty: number; revenue: number }

const data = toState<SalesRow[]>([
  { product: "Widget A", qty: 10, revenue: 500 },
  { product: "Widget B", qty: 5,  revenue: 300 },
])

const table = createDomphyTable({
  data: data.get(),
  columns: [
    columnHelper.accessor("product", { header: "Product" }),
    columnHelper.accessor("qty",     { header: "Qty",     footer: (info) => {
      const rows = info.table.getFilteredRowModel().rows
      return rows.reduce((sum, r) => sum + (r.getValue<number>("qty") ?? 0), 0)
    }}),
    columnHelper.accessor("revenue", { header: "Revenue", footer: (info) => {
      const rows = info.table.getFilteredRowModel().rows
      const total = rows.reduce((sum, r) => sum + (r.getValue<number>("revenue") ?? 0), 0)
      return `$${total.toLocaleString()}`
    }}),
  ],
})

// Render footer as a sticky totals row
const TotalsRow = {
  tfoot: {
    tr: (l) => table.getFooterGroups(l)[0]?.headers.map((header) => ({
      td: String(header.column.columnDef.footer?.({ table: table.table, header, column: header.column }) ?? ""),
      _key: header.id,
      style: { fontWeight: "bold" },
    })) ?? [],
    style: {
      position: "sticky",
      bottom: 0,
      background: "var(--neutral-2)",
    },
  },
}
```

## Row pinning with row selection

Pin all selected rows to the top — useful for batch-action tables:

```ts
const table = createDomphyTable({
  data: rows,
  columns,
  enableRowPinning: true,
  enableRowSelection: true,
  // Auto-pin selected rows to the top
  onRowSelectionChange: (updater) => {
    const newSelection = typeof updater === "function"
      ? updater(table.table.getState().rowSelection)
      : updater

    // Pin newly selected rows
    Object.keys(newSelection).forEach((id) => {
      if (newSelection[id]) table.getRow(id)?.pin("top")
      else table.getRow(id)?.pin(false)
    })

    table.table.setRowSelection(newSelection)
  },
})
```

## Pinned row API

| Method | Description |
|--------|-------------|
| `row.pin("top")` | Pin row to the top |
| `row.pin("bottom")` | Pin row to the bottom |
| `row.pin(false)` | Unpin row |
| `row.getIsPinned()` | `"top"` \| `"bottom"` \| `false` |
| `row.getPinnedIndex()` | Position in the pinned list |
| `table.getTopRows(l)` | Reactive list of top-pinned rows |
| `table.getBottomRows(l)` | Reactive list of bottom-pinned rows |
| `table.getCenterRows(l)` | Non-pinned rows (between top and bottom) |
| `table.setRowPinning(updater)` | Programmatically set pinning state |
| `table.resetRowPinning()` | Unpin all rows |
