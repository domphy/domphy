# Advanced Features

Each feature below follows the same pattern as [sorting and filtering](./sorting-filtering): pass the row model factory if one exists, drive state through instance methods, and let the `tableVersion` bridge re-render the UI.

## Grouping & Aggregation

Pass `getGroupedRowModel()` (plus `getExpandedRowModel()` if group rows should expand) and set which columns to group by:

```ts
import { getGroupedRowModel, getExpandedRowModel } from "@domphy/table"

// in createTable options:
getGroupedRowModel: getGroupedRowModel(),
getExpandedRowModel: getExpandedRowModel(),
```

```ts
table.setGrouping(["status"])
table.resetGrouping()
// or per column: column.toggleGrouping(), column.getIsGrouped()
```

Grouped rows aggregate their leaf rows. Pick the function per column with `aggregationFn`:

| `aggregationFn` | Result |
|---|---|
| `sum`, `min`, `max`, `mean`, `median` | Numeric aggregates. |
| `extent` | `[min, max]` tuple. |
| `unique` | Array of distinct values. |
| `uniqueCount` | Number of distinct values. |
| `count` | Leaf row count (default for group rows). |

```ts
helper.accessor("visits", { aggregationFn: "sum" })
```

When rendering, group rows report their kind per cell: `cell.getIsGrouped()` (the grouped value plus `row.subRows.length`), `cell.getIsAggregated()` (render the aggregate), `cell.getIsPlaceholder()` (render nothing). All built-ins are exported as the `aggregationFns` object; a custom one is `(columnId, leafRows, childRows) => value`.

## Expanding & Sub-Rows

For hierarchical data, tell the core row model where children live and pass `getExpandedRowModel()`:

```ts
const table = createTable({
    data,
    columns,
    getSubRows: (row) => row.children,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    // ...
})
```

`table.getRowModel().rows` then flattens expanded children in place. Per row:

- `row.getCanExpand()` — has sub-rows (or `getRowCanExpand` says so)
- `row.getIsExpanded()` / `row.toggleExpanded(value?)`
- `row.getToggleExpandedHandler()` — ready-made click handler
- `row.depth` — indent level

```ts
td: cell.column.id === "name"
    ? {
        div: [
            row.getCanExpand()
                ? { button: row.getIsExpanded() ? "▼" : "▶", onclick: row.getToggleExpandedHandler(), $: [button()] }
                : null,
            String(cell.getValue()),
        ],
        style: { paddingLeft: `${row.depth * 1.5}rem` },
    }
    : String(cell.getValue() ?? ""),
```

`table.toggleAllRowsExpanded()` and `table.setExpanded(true)` work on the whole tree (`expanded: true` means "everything expanded").

## Column Visibility

No row model needed — visibility filters which leaf columns appear:

```ts
table.getColumn("age")!.toggleVisibility()       // or .toggleVisibility(false)
table.getColumn("age")!.getIsVisible()
table.toggleAllColumnsVisible(true)
```

Render from the visibility-aware getters and columns hide everywhere automatically: `table.getVisibleLeafColumns()`, `row.getVisibleCells()`, and header groups already respect it. A column with `enableHiding: false` is exempt. A visibility menu is one loop over `table.getAllLeafColumns()` with an `inputCheckbox()` per column bound to `column.getIsVisible()` / `column.toggleVisibility()`.

## Column Ordering

```ts
table.setColumnOrder(["select", "fullName", "age", "visits"])
table.resetColumnOrder()
```

The state is an array of column ids; unlisted columns append in definition order. Pinning (below) takes precedence over ordering for the pinned sections.

## Column Pinning

Pin columns to either edge:

```ts
table.setColumnPinning({ left: ["select"], right: ["actions"] })
// or per column: column.pin("left"), column.pin(false), column.getIsPinned()
```

Read the three sections separately when you need split rendering (e.g. sticky columns):

- `table.getLeftLeafColumns()` / `table.getCenterLeafColumns()` / `table.getRightLeafColumns()`
- `table.getLeftHeaderGroups()` / center / right variants
- `row.getLeftVisibleCells()` / `row.getCenterVisibleCells()` / `row.getRightVisibleCells()`

For CSS-sticky pinning in one `<table>`, keep rendering `row.getVisibleCells()` (pinned cells are ordered left → center → right) and use `column.getIsPinned()` with `column.getStart("left")` / `column.getAfter("right")` to compute the sticky offsets.

## Column Sizing

Sizes are plain numbers in state — `column.getSize()` returns the current size (default 150, bounded by `minSize` / `maxSize` from the column def):

```ts
helper.accessor("firstName", { size: 240, minSize: 80 })
```

```ts
th: { ..., style: { width: `${header.getSize()}px` } },
```

Set sizes directly with `table.setColumnSizing({ firstName: 300 })`, or build a resize handle: `header.getResizeHandler()` returns a `mousedown`/`touchstart` handler that tracks the drag and writes `columnSizing` state for you. During a drag, `column.getIsResizing()` is `true`; the `columnResizeMode` option picks whether sizes apply live (`"onChange"`) or on release (`"onEnd"`).

```ts
{ div: null, onmousedown: header.getResizeHandler(), style: { cursor: "col-resize", ... } }
```

## Faceting

Faceting computes value statistics per column for building filter UIs — pass the row models and read, never set:

```ts
import { getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues } from "@domphy/table"

// in createTable options:
getFacetedRowModel: getFacetedRowModel(),
getFacetedUniqueValues: getFacetedUniqueValues(),
getFacetedMinMaxValues: getFacetedMinMaxValues(),
```

```ts
const statusColumn = table.getColumn("status")!

// Map<value, count> — feed a select() or checkbox list of available filter options
const options = [...statusColumn.getFacetedUniqueValues().keys()]

// [min, max] — feed an inputRange() for a number range filter
const range = table.getColumn("age")!.getFacetedMinMaxValues()
```

Facets are computed from rows filtered by *every other* column, so the option list always reflects what selecting it would actually match.
