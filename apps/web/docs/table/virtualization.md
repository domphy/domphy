---
title: "Virtualization & Large Datasets"
description: "Render 100k+ row tables with @domphy/virtual, including row virtualization, infinite scroll, and column pinning with virtual columns."
---

# Virtualization & Large Datasets

For large tables (1 000+ rows), pair `@domphy/table` with `@domphy/virtual` to render only visible rows.

## Row virtualization

```ts
import { createDomphyTable } from "@domphy/table/domphy"
import { createVirtualizer } from "@domphy/virtual/domphy"
import { toState } from "@domphy/core"

const data = toState<Row[]>(largeDataset)

const table = createDomphyTable({
  data: () => data.get(),
  columns: [
    columnHelper.accessor("name", { header: "Name" }),
    columnHelper.accessor("status", { header: "Status" }),
    columnHelper.accessor("amount", { header: "Amount" }),
  ],
  // Optional: server-side pagination can skip virtualization
})

const ROW_HEIGHT = 40   // px — must be fixed for performant virtualization

const list = createVirtualizer({
  count: 0,   // updated via setOptions when table rows change
  estimateSize: () => ROW_HEIGHT,
  overscan: 10,
})

const App = {
  div: [
    // Fixed header — NOT virtualized
    {
      div: (l) => table.getHeaderGroups(l).map((group) => ({
        _key: group.id,
        div: group.headers.map((header) => ({
          _key: header.id,
          div: String(header.column.columnDef.header ?? ""),
          style: { width: `${header.column.getSize()}px` },
        })),
        style: { display: "flex" },
      })),
      style: { position: "sticky", top: 0, background: "white", zIndex: 1 },
    },
    // Scrollable body — virtualized
    {
      div: {
        // Spacer holds the full scroll height
        div: (l) => list.getVirtualItems(l).map((virtualRow) => {
          const row = table.getRowModel().rows[virtualRow.index]
          return {
            _key: row.id,
            div: row.getVisibleCells().map((cell) => ({
              _key: cell.id,
              div: String(cell.getValue() ?? ""),
              style: { width: `${cell.column.getSize()}px` },
            })),
            style: {
              position: "absolute",
              top: `${virtualRow.start}px`,
              height: `${ROW_HEIGHT}px`,
              display: "flex",
              width: "100%",
            },
          }
        }),
        style: {
          position: "relative",
          height: () => `${list.getTotalSize()}px`,
        },
      },
      _onMount: (node) => {
        list.setScrollElement(node.domElement)
        // Sync count when table rows change
        table.subscribe(() => {
          list.setOptions({ count: table.getRowModel().rows.length, estimateSize: () => ROW_HEIGHT })
        })
      },
      _onRemove: () => list.destroy(),
      style: { height: "600px", overflowY: "auto", position: "relative" },
    },
  ],
}
```

## Dynamic row heights

When rows have variable heights (expandable rows, multi-line cells), use `measureElement`:

```ts
const list = createVirtualizer({
  count: 0,
  estimateSize: () => 48,   // initial estimate
  overscan: 5,
})

// In the row render:
{
  div: row.getVisibleCells().map(...),
  _key: row.id,
  _onMount: (node) => list.measureElement(node.domElement),   // auto-measures height
  style: {
    position: "absolute",
    top: `${virtualRow.start}px`,
    // No fixed height — measured from DOM
    width: "100%",
  },
}
```

## Infinite scroll

Replace pagination with scroll-to-load by combining `isAtEnd()` with a data-fetching trigger:

```ts
import { createQuery } from "@domphy/query/domphy"
import { toState } from "@domphy/core"

const page = toState(0)
const allRows = toState<Row[]>([])

const query = createQuery({
  queryKey: () => ["rows", page.get()],
  queryFn: () => fetchRows(page.get()),
  onSuccess: (newRows) => allRows.set([...allRows.get(), ...newRows]),
})

const list = createVirtualizer({
  count: () => allRows.get().length,
  estimateSize: () => 40,
  onChange: (v) => {
    if (v.isAtEnd(100) && !query.isFetching()) {
      page.set(page.get() + 1)
    }
  },
})
```

## Column virtualization

For wide tables (50+ columns), virtualize columns too:

```ts
const colVirt = createVirtualizer({
  count: table.getAllLeafColumns().length,
  estimateSize: (i) => table.getAllLeafColumns()[i].getSize(),
  horizontal: true,
  overscan: 3,
})

// In row render — only render visible columns
const VisibleCells = (row: Row<Data>) => (l: Listener) =>
  colVirt.getVirtualItems(l).map((virtCol) => {
    const cell = row.getAllCells()[virtCol.index]
    return {
      _key: cell.id,
      div: String(cell.getValue() ?? ""),
      style: {
        position: "absolute",
        left: `${virtCol.start}px`,
        width: `${virtCol.size}px`,
        height: "100%",
      },
    }
  })
```

## Server-side data (manual pagination)

Use `manualPagination` when the server handles paging instead of the table:

```ts
const totalCount = toState(0)
const pagination = toState({ pageIndex: 0, pageSize: 50 })

const table = createDomphyTable({
  data: () => serverData.get(),
  columns,
  manualPagination: true,
  rowCount: () => totalCount.get(),
  state: { pagination: () => pagination.get() },
  onPaginationChange: (updater) => pagination.set(updater),
})
```

With server pagination there is no need for client-side row virtualization — just use the built-in paginator.

## Performance tips

- **Fixed column widths**: call `table.setColumnSizing({ name: 200, status: 100, ... })` upfront to avoid layout thrash on first render.
- **Memoize cell renderers**: if cell content is expensive, compute it outside the reactive path and key by row+column ID.
- **`overscan: 5–15`**: for fast scroll / touch inertia, higher overscan reduces blank flash.
- **Stable data reference**: avoid re-creating the data array on each render tick — use `toState` so the reference only changes when data actually changes.
