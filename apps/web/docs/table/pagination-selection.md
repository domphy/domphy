# Pagination & Selection

## Pagination

Pass `getPaginationRowModel()` — `table.getRowModel()` then returns only the current page:

```ts
import { createTable, getCoreRowModel, getPaginationRowModel } from "@domphy/table"

const table = createTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // ...bridge options from the overview
})
```

The default page size is 10. Seed a different one through `initialState`:

```ts
initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
```

### Page Controls

| Method | Does |
|---|---|
| `table.setPageIndex(index)` | Jump to a page (0-based). |
| `table.setPageSize(size)` | Change page size; the index is clamped to keep the first row visible. |
| `table.nextPage()` / `table.previousPage()` | Step one page. |
| `table.firstPage()` / `table.lastPage()` | Jump to either end. |
| `table.getPageCount()` | Total pages after filtering. |
| `table.getCanNextPage()` / `table.getCanPreviousPage()` | Boundary checks for disabling buttons. |

```ts
const Pager: DomphyElement<"div"> = {
    div: (l) => {
        tableVersion.get(l)
        const { pageIndex } = table.getState().pagination
        return [
            {
                button: "Previous",
                onclick: () => table.previousPage(),
                disabled: !table.getCanPreviousPage(),
                $: [button()],
            },
            { span: `Page ${pageIndex + 1} of ${table.getPageCount()}` },
            {
                button: "Next",
                onclick: () => table.nextPage(),
                disabled: !table.getCanNextPage(),
                $: [button()],
            },
        ]
    },
}
```

Pagination runs after sorting and filtering, so changing a filter automatically recomputes `getPageCount()`. For server-side data, set `manualPagination: true` with `pageCount` (or `rowCount`) and fetch per page yourself.

## Row Selection

Selection needs no extra row model — enable it and drive it per row:

```ts
const table = createTable({
    // ...
    enableRowSelection: true, // or a predicate: (row) => row.original.age >= 18
})
```

Selection state is a map of row ids in `state.rowSelection`. The API:

- `row.toggleSelected(value?)` / `row.getIsSelected()` / `row.getCanSelect()`
- `table.toggleAllRowsSelected(value?)` / `table.getIsAllRowsSelected()` / `table.getIsSomeRowsSelected()`
- `table.toggleAllPageRowsSelected(value?)` — current page only
- `table.getSelectedRowModel()` — the selected rows as a row model (`.rows`, `row.original` for your data)
- `table.resetRowSelection()`

```ts
const selected = table.getSelectedRowModel().rows.map((row) => row.original)
```

## Checkbox Column Recipe

A `display` column with Domphy's `inputCheckbox()` patch — header checkbox selects all, row checkboxes select one:

```ts
import { inputCheckbox } from "@domphy/ui"

const selectColumn = helper.display({ id: "select" })
```

Render it specially when building cells (the column has no value, so branch on `column.id`):

```ts
// header cell
th: header.column.id === "select"
    ? {
        input: null,
        type: "checkbox",
        checked: table.getIsAllRowsSelected(),
        indeterminate: table.getIsSomeRowsSelected(),
        onchange: () => table.toggleAllRowsSelected(),
        $: [inputCheckbox()],
    }
    : String(header.column.columnDef.header),

// body cell
td: cell.column.id === "select"
    ? {
        input: null,
        type: "checkbox",
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onchange: () => row.toggleSelected(),
        $: [inputCheckbox()],
    }
    : String(cell.getValue() ?? ""),
```

Because the whole `table:` render function re-runs on every `tableVersion` bump, `checked` stays in sync with `state.rowSelection` without any extra wiring. Selection survives sorting and filtering (it is keyed by `row.id`); whether it survives pagination of filtered-out rows depends on `enableSubRowSelection` and your row id strategy — pass `getRowId: (row) => row.id` to key selection by your own ids instead of row index.
