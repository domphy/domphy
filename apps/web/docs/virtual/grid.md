---
title: "Grid Virtualization"
description: "Virtualize two-dimensional grids and spreadsheet-like layouts with column and row virtualizers."
---

# Grid Virtualization

## Two-dimensional virtualization

For grids and spreadsheets, create separate virtualizers for rows and columns:

```ts
import { createVirtualizer } from "@domphy/virtual/domphy"
import { toState } from "@domphy/core"

const ROW_COUNT = 10_000
const COL_COUNT = 50

const container = toState<HTMLElement | null>(null)

const rowVirtualizer = createVirtualizer({
  count: ROW_COUNT,
  estimateSize: () => 40,           // row height in px
  getScrollElement: () => container.get(),
  overscan: 5,
})

const colVirtualizer = createVirtualizer({
  count: COL_COUNT,
  estimateSize: () => 120,          // column width in px
  getScrollElement: () => container.get(),
  horizontal: true,                 // scroll horizontally
  overscan: 2,
})
```

## Rendering the grid

```ts
const Grid = {
  div: [
    {
      div: (l) => {
        const totalHeight = rowVirtualizer.getTotalSize(l)
        const totalWidth  = colVirtualizer.getTotalSize(l)
        const virtualRows = rowVirtualizer.getVirtualItems(l)
        const virtualCols = colVirtualizer.getVirtualItems(l)

        return {
          div: virtualRows.map((virtualRow) => ({
            _key: virtualRow.key,
            div: virtualCols.map((virtualCol) => ({
              _key: virtualCol.key,
              div: `Row ${virtualRow.index}, Col ${virtualCol.index}`,
              style: {
                position: "absolute",
                top: 0,
                left: 0,
                width: `${virtualCol.size}px`,
                height: `${virtualRow.size}px`,
                transform: `translateX(${virtualCol.start}px) translateY(${virtualRow.start}px)`,
                borderRight: "1px solid var(--neutral-4)",
                borderBottom: "1px solid var(--neutral-4)",
                padding: "4px 8px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              },
            })),
            style: { position: "absolute", top: 0, left: 0, display: "contents" },
          })),
          style: {
            position: "relative",
            height: `${totalHeight}px`,
            width: `${totalWidth}px`,
          },
        }
      },
    },
  ],
  style: {
    overflow: "auto",
    height: "600px",
    width: "100%",
    position: "relative",
  },
  _onMount: (el) => container.set(el),
}
```

## Sticky headers

Pin the first row and first column while the rest scroll:

```ts
const headers = ["Name", "Email", "Role", "Status", "Created", "Actions"]

const StickyGrid = {
  div: [
    // Sticky header row
    {
      div: (l) => {
        const virtualCols = colVirtualizer.getVirtualItems(l)
        const totalWidth  = colVirtualizer.getTotalSize(l)

        return {
          div: virtualCols.map((vc) => ({
            _key: vc.key,
            div: headers[vc.index] ?? `Col ${vc.index}`,
            style: {
              position: "absolute",
              left: `${vc.start}px`,
              width: `${vc.size}px`,
              padding: "8px",
              fontWeight: "600",
            },
          })),
          style: { position: "relative", width: `${totalWidth}px` },
        }
      },
      style: {
        position: "sticky",
        top: 0,
        background: "var(--neutral-1)",
        zIndex: 1,
        borderBottom: "2px solid var(--neutral-4)",
        height: "40px",
      },
    },
    // Scrollable body
    {
      div: null,
      // ...same grid render as above
    },
  ],
  style: { overflow: "auto", height: "600px" },
}
```

## Variable row heights

When rows have different heights (e.g., expandable rows), use `measureElement`:

```ts
const rowVirtualizer = createVirtualizer({
  count: ROW_COUNT,
  estimateSize: () => 40,      // initial estimate
  measureElement: (el) => el.getBoundingClientRect().height,
  getScrollElement: () => container.get(),
})

// Attach measurement ref to each row
const Row = (virtualRow: VirtualItem) => ({
  div: RowContent(virtualRow.index),
  _onMount: (el: HTMLElement) => rowVirtualizer.measureElement(el),
  _key: virtualRow.key,
  style: {
    position: "absolute",
    top: 0,
    transform: `translateY(${virtualRow.start}px)`,
    width: "100%",
  },
})
```

## Scroll to cell

Navigate programmatically to a specific row/column:

```ts
function scrollToCell(row: number, col: number) {
  rowVirtualizer.scrollToIndex(row, { align: "center", behavior: "smooth" })
  colVirtualizer.scrollToIndex(col, { align: "center", behavior: "smooth" })
}

const GoToButton = {
  button: "Go to row 5000, col 25",
  onClick: () => scrollToCell(5000, 25),
}
```

## Performance tips

- Set realistic `estimateSize` — bad estimates cause layout jumps on first render
- Use `overscan: 3–5` for rows, `overscan: 1–2` for columns (columns change less often during vertical scroll)
- For fixed-size grids (all cells same size), avoid `measureElement` — `estimateSize` is much faster
- Use `_key` on both row and cell elements for stable reconciliation
