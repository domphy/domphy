# Sorting & Filtering

Both features follow the same shape: pass the row model factory, then drive state through column or table methods. Every state change flows through `onStateChange`, bumps `tableVersion`, and the UI re-reads the instance.

## Sorting

Pass `getSortedRowModel()` and toggle from a header click:

```ts
import { createTable, getCoreRowModel, getSortedRowModel } from "@domphy/table"

const table = createTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // ...bridge options from the overview
})
```

```ts
thead: table.getHeaderGroups().map((headerGroup) => ({
    tr: headerGroup.headers.map((header) => ({
        th: [
            String(header.column.columnDef.header),
            { asc: " ▲", desc: " ▼", false: "" }[String(header.column.getIsSorted())],
        ],
        onClick: () => header.column.toggleSorting(),
        _key: header.id,
    })),
    _key: headerGroup.id,
})),
```

The per-column API:

- `column.toggleSorting(desc?, multi?)` — cycle `asc` → `desc` → unsorted (or force a direction)
- `column.getIsSorted()` — `"asc" | "desc" | false`
- `column.getCanSort()`, `column.clearSorting()`, `column.getToggleSortingHandler()`

Or set the whole state imperatively:

```ts
table.setSorting([{ id: "age", desc: true }])
table.resetSorting()
```

## Multi-Sort

Sorting state is an array, so multi-sort works out of the box — hold a modifier and pass `multi: true` (the default `getToggleSortingHandler()` reads `event.shiftKey` for you):

```ts
onClick: (e: MouseEvent) => header.column.toggleSorting(undefined, e.shiftKey),
```

Control it with the `enableMultiSort`, `maxMultiSortColCount`, and `isMultiSortEvent` table options.

## Built-In Sorting Functions

Pick per column with `sortingFn`, or rely on auto-detection:

| `sortingFn` | Behavior |
|---|---|
| `alphanumeric` | Mixed strings/numbers, case-insensitive (default for mixed values). |
| `alphanumericCaseSensitive` | Same, case-sensitive. |
| `text` | Plain string compare, case-insensitive. |
| `textCaseSensitive` | Plain string compare, case-sensitive. |
| `datetime` | `Date` values. |
| `basic` | Fast `a > b` compare (default for numbers). |

```ts
helper.accessor("createdAt", { sortingFn: "datetime" })
```

A custom `sortingFn` is `(rowA, rowB, columnId) => number`. All built-ins are also exported as the `sortingFns` object.

## Column Filters

Pass `getFilteredRowModel()` and set values per column:

```ts
import { getFilteredRowModel } from "@domphy/table"

// in createTable options:
getFilteredRowModel: getFilteredRowModel(),
```

```ts
const nameColumn = table.getColumn("firstName")!

const FilterInput: DomphyElement<"input"> = {
    input: null,
    placeholder: "Filter names...",
    oninput: (e, node) => nameColumn.setFilterValue(node.element.value),
    $: [inputText()],
}
```

The per-column API: `column.setFilterValue(value)`, `column.getFilterValue()`, `column.getIsFiltered()`, `column.getCanFilter()`. Setting a filter value to `undefined` (or an empty string for string filters) removes it automatically.

## Built-In Filter Functions

Pick per column with `filterFn`:

| `filterFn` | Matches when |
|---|---|
| `includesString` | Value contains the filter string, case-insensitive (default for strings). |
| `includesStringSensitive` | Same, case-sensitive. |
| `equalsString` | Value equals the filter string, case-insensitive. |
| `equals` | Strict `===`. |
| `weakEquals` | Loose `==`. |
| `arrIncludes` | Array value includes the filter value. |
| `arrIncludesAll` | Array value includes all filter values. |
| `arrIncludesSome` | Array value includes at least one filter value. |
| `inNumberRange` | Value is within `[min, max]`. |

```ts
helper.accessor("age", { filterFn: "inNumberRange" })

table.getColumn("age")!.setFilterValue([18, 65])
```

All built-ins are exported as the `filterFns` object.

## Custom Filter Functions

A filter function is `(row, columnId, filterValue) => boolean`:

```ts
helper.accessor("status", {
    filterFn: (row, columnId, filterValue: string[]) =>
        filterValue.length === 0 || filterValue.includes(row.getValue(columnId)),
})
```

Optional statics refine behavior: `myFilterFn.autoRemove = (value) => ...` removes the filter when the value is "empty", and `myFilterFn.resolveFilterValue` pre-transforms the value once before filtering.

## Global Filtering

One filter value applied across all filterable columns — same `getFilteredRowModel()` powers it:

```ts
const SearchInput: DomphyElement<"input"> = {
    input: null,
    placeholder: "Search all columns...",
    oninput: (e, node) => table.setGlobalFilter(node.element.value),
    $: [inputText()],
}
```

- `table.setGlobalFilter(value)` / `table.resetGlobalFilter()` — state lives in `state.globalFilter`
- `globalFilterFn` table option picks the function (auto-detected otherwise; inspect with `table.getGlobalFilterFn()`)
- the same `getFilteredRowModel()` applies it — `table.getFilteredRowModel()` returns rows after both column and global filters, `table.getPreFilteredRowModel()` returns rows before either

Column filters and the global filter compose — a row must pass both to appear in `table.getRowModel()`.
