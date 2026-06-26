---
title: "Column Groups & Header Groups"
description: "Span multiple columns with header groups, nested column definitions, and multi-level headers."
---

# Column Groups & Header Groups

## Basic column groups

Group related columns under a shared header using nested column definitions:

```ts
import { createColumnHelper, createDomphyTable } from "@domphy/table/domphy"

interface Employee {
  id: number
  name: string
  department: string
  salary: number
  startDate: string
  manager: string
}

const col = createColumnHelper<Employee>()

const columns = [
  col.group({
    id: "personal",
    header: "Personal Info",
    columns: [
      col.accessor("name", { header: "Name" }),
      col.accessor("department", { header: "Department" }),
    ],
  }),
  col.group({
    id: "employment",
    header: "Employment",
    columns: [
      col.accessor("salary", { header: "Salary" }),
      col.accessor("startDate", { header: "Start Date" }),
      col.accessor("manager", { header: "Manager" }),
    ],
  }),
]

const table = createDomphyTable({ data: () => employees, columns })
```

## Rendering multi-level headers

Use `table.getHeaderGroups(l)` which returns header rows from top to bottom:

```ts
const TableHead = {
  thead: (l) => table.getHeaderGroups(l).map((headerGroup) => ({
    _key: headerGroup.id,
    tr: headerGroup.headers.map((header) => ({
      _key: header.id,
      th: header.isPlaceholder
        ? null
        : String(header.column.columnDef.header ?? ""),
      colSpan: header.colSpan,    // spans the group's sub-columns
      rowSpan: header.rowSpan,    // for leaf headers that span multiple rows
      style: {
        textAlign: "center",
        borderBottom: (l) => `1px solid ${themeColor(l, "shift-3")}`,
        padding: (l) => `${themeSpacing(1)} ${themeSpacing(2)}`,
      },
    })),
  })),
}
```

`header.isPlaceholder` is `true` for empty cells in the header row above leaf columns — use `null` content for these.

## Three levels deep

```ts
const deepColumns = [
  col.group({
    id: "contact",
    header: "Contact",
    columns: [
      col.group({
        id: "contact-primary",
        header: "Primary",
        columns: [
          col.accessor("email", { header: "Email" }),
          col.accessor("phone", { header: "Phone" }),
        ],
      }),
      col.group({
        id: "contact-secondary",
        header: "Secondary",
        columns: [
          col.accessor("altEmail", { header: "Alt Email" }),
        ],
      }),
    ],
  }),
]
```

`getHeaderGroups()` returns one row per level — 3 levels → 3 rows in `<thead>`.

## Column span calculation

`header.colSpan` automatically computes how many leaf columns a group spans:

```ts
// For a group with 3 leaf columns:
// header.colSpan === 3
// header.rowSpan === 1 (it spans 1 row)

// For a leaf column in a 2-level deep table:
// header.colSpan === 1
// header.rowSpan === 1 (occupies 1 row at the bottom level)

// For a leaf in a 1-level table that also has 2-level groups:
// header.colSpan === 1
// header.rowSpan === 2 (spans 2 header rows to fill the gap)
```

## Column group footers

Define footer content at the group level:

```ts
const columns = [
  col.group({
    id: "financial",
    header: "Financial",
    footer: "Totals",
    columns: [
      col.accessor("revenue", {
        header: "Revenue",
        footer: (info) => {
          const total = info.table.getFilteredRowModel().rows.reduce(
            (sum, row) => sum + (row.getValue("revenue") as number),
            0,
          )
          return `$${total.toLocaleString()}`
        },
      }),
      col.accessor("costs", {
        header: "Costs",
        footer: (info) => {
          const total = info.table.getFilteredRowModel().rows.reduce(
            (sum, row) => sum + (row.getValue("costs") as number),
            0,
          )
          return `$${total.toLocaleString()}`
        },
      }),
    ],
  }),
]
```

## Rendering footer groups

```ts
const TableFoot = {
  tfoot: (l) => table.getFooterGroups(l).map((footerGroup) => ({
    _key: footerGroup.id,
    tr: footerGroup.headers.map((header) => ({
      _key: header.id,
      td: header.isPlaceholder ? null : String(header.column.columnDef.footer ?? ""),
      colSpan: header.colSpan,
      style: { fontWeight: "bold", textAlign: "right" },
    })),
  })),
}
```

## Column group sorting

Sorting applies to leaf columns, not groups. Clicking a group header is not sortable by default — disable sorting on group columns:

```ts
const columns = [
  col.group({
    id: "info",
    header: "Employee Info",
    enableSorting: false,   // groups cannot be sorted
    columns: [
      col.accessor("name", { header: "Name", enableSorting: true }),
      col.accessor("department", { header: "Dept", enableSorting: true }),
    ],
  }),
]
```

## Hide/show column groups

Toggle visibility of all columns in a group at once:

```ts
function toggleGroup(groupId: string, visible: boolean) {
  const group = table.table.getColumn(groupId)
  if (group) {
    group.getLeafColumns().forEach(col => col.toggleVisibility(visible))
  }
}

const HideFinancialColumns = {
  button: "Hide financial data",
  onClick: () => toggleGroup("financial", false),
}
```
