---
title: "Grouping & Expanding"
description: "Group rows by column values, aggregate grouped data, and expand/collapse row groups."
---

# Grouping & Expanding

## Enable grouping

Column grouping lets you fold rows with the same value into a collapsible group:

```ts
import { createDomphyTable } from "@domphy/table/domphy"
import { toState } from "@domphy/core"

const grouping = toState<string[]>([])

const table = createDomphyTable({
  data: () => employees,
  columns,
  state: { grouping: grouping.get() },
  onGroupingChange: (updater) => {
    grouping.set(typeof updater === "function" ? updater(grouping.get()) : updater)
  },
  getExpandedRowModel: getExpandedRowModel(),
  getGroupedRowModel: getGroupedRowModel(),
  getAggregatedRowModel: getAggregatedRowModel(),
})
```

## Marking columns as groupable

```ts
import { createColumnHelper } from "@domphy/table"

const col = createColumnHelper<Employee>()

const columns = [
  col.accessor("department", {
    header: "Department",
    enableGrouping: true,
  }),
  col.accessor("role", {
    header: "Role",
    enableGrouping: true,
  }),
  col.accessor("salary", {
    header: "Salary",
    aggregationFn: "sum",   // sum salaries in group
  }),
  col.accessor("name", {
    header: "Name",
    enableGrouping: false,   // cannot group by name
  }),
]
```

## Aggregation functions

Control how grouped values are computed:

| Function | Description |
|----------|-------------|
| `"count"` | Count of rows in group |
| `"sum"` | Sum of numeric values |
| `"min"` | Minimum value |
| `"max"` | Maximum value |
| `"mean"` | Average of numeric values |
| `"median"` | Median value |
| `"unique"` | Array of unique values |
| `"uniqueCount"` | Count of unique values |
| Custom | `(columnId, leafRows, childRows) => value` |

```ts
col.accessor("revenue", {
  header: "Revenue",
  aggregationFn: (columnId, leafRows) => {
    return leafRows.reduce((sum, row) => sum + (row.getValue(columnId) as number), 0)
  },
  aggregatedCell: ({ getValue }) => `$${(getValue<number>()).toLocaleString()}`,
})
```

## Rendering grouped rows

```ts
const TableBody = {
  tbody: (l) => table.getRowModel(l).rows.map((row) => ({
    _key: row.id,
    tr: (l) => {
      if (row.getIsGrouped()) {
        // Group header row
        return row.getVisibleCells(l).map((cell) => ({
          td: (l) => {
            if (cell.getIsGrouped()) {
              // The grouped cell — show toggle + label
              return {
                div: [
                  {
                    button: row.getIsExpanded(l) ? "▾" : "▸",
                    onClick: () => row.toggleExpanded(),
                    style: { marginRight: "4px", cursor: "pointer" },
                  },
                  { span: String(cell.renderValue()) },
                  { span: ` (${row.subRows.length})`, style: { opacity: 0.6 } },
                ],
                style: { display: "flex", alignItems: "center" },
              }
            }
            if (cell.getIsAggregated()) {
              // Aggregated value cell
              return { td: String(cell.renderValue()) }
            }
            // Placeholder
            return { td: null }
          },
          colSpan: cell.getIsGrouped() ? 1 : undefined,
          _key: cell.id,
        }))
      }

      // Regular leaf row
      return row.getVisibleCells(l).map((cell) => ({
        td: String(cell.renderValue()),
        _key: cell.id,
      }))
    },
  })),
}
```

## Programmatic grouping

Toggle grouping by column ID:

```ts
const GroupByDepartment = {
  button: (l) => {
    const isGrouped = grouping.get(l).includes("department")
    return isGrouped ? "Ungroup" : "Group by Department"
  },
  onClick: (l) => {
    const isGrouped = grouping.get().includes("department")
    if (isGrouped) {
      grouping.set(grouping.get().filter(id => id !== "department"))
    } else {
      grouping.set([...grouping.get(), "department"])
    }
  },
}
```

Or use the column toggle:

```ts
const col = table.table.getColumn("department")

const GroupToggle = {
  button: (l) => col?.getIsGrouped(l) ? "Ungroup" : "Group",
  onClick: () => col?.toggleGrouping(),
}
```

## Expand/collapse all

```ts
const ExpandAll = {
  button: (l) => table.getIsAllRowsExpanded(l) ? "Collapse all" : "Expand all",
  onClick: () => table.table.toggleAllRowsExpanded(),
}
```

## Expand API

| Method | Description |
|--------|-------------|
| `row.getIsGrouped()` | `true` if this row is a group header |
| `row.getIsExpanded(l)` | `true` if the group is open |
| `row.toggleExpanded()` | Toggle expand/collapse |
| `row.getCanExpand()` | `true` if has subrows |
| `row.subRows` | Child rows in this group |
| `table.getIsAllRowsExpanded(l)` | `true` if all groups are open |
| `table.toggleAllRowsExpanded()` | Toggle all |
