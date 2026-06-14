# API Reference

`@domphy/table` is a 1-1 port of `@tanstack/table-core` v8.21.3 — every export below has identical behavior to upstream, so the [TanStack Table v8 reference](https://tanstack.com/table/v8/docs) documents each item in full detail.

## Core

- `createTable(options)` — builds the table instance. Key options: `data`, `columns`, `state`, `onStateChange`, `initialState`, the `get*RowModel` factories, `getRowId`, `getSubRows`, `renderFallbackValue`, plus per-feature `enable*` / `manual*` flags
- `createColumnHelper<TData>()` — typed column def builder: `accessor` (by key or function), `display`, `group`

## Row Models

All opt-in factories passed into `createTable` options; only the first is required:

- `getCoreRowModel()` — base rows from `data`
- `getSortedRowModel()` — sorting
- `getFilteredRowModel()` — column filters + global filter
- `getPaginationRowModel()` — page slicing
- `getGroupedRowModel()` — grouping and aggregation
- `getExpandedRowModel()` — expanding and sub-rows
- `getFacetedRowModel()` — per-column faceting base
- `getFacetedUniqueValues()` — `Map<value, count>` per column
- `getFacetedMinMaxValues()` — `[min, max]` per column

## Built-In Functions

- `sortingFns` — `alphanumeric`, `alphanumericCaseSensitive`, `text`, `textCaseSensitive`, `datetime`, `basic`
- `filterFns` — `includesString`, `includesStringSensitive`, `equalsString`, `equals`, `weakEquals`, `arrIncludes`, `arrIncludesAll`, `arrIncludesSome`, `inNumberRange`
- `aggregationFns` — `sum`, `min`, `max`, `extent`, `mean`, `median`, `unique`, `uniqueCount`, `count`

## Instance APIs Per Feature

Each feature contributes methods to the table, column, row, and header objects. Summarized; see the feature pages for usage:

- **Sorting** — `table.setSorting`/`resetSorting`; `column.toggleSorting`, `getIsSorted`, `getCanSort`, `clearSorting`, `getToggleSortingHandler`
- **Column filtering** — `table.setColumnFilters`; `column.setFilterValue`, `getFilterValue`, `getIsFiltered`, `getCanFilter`
- **Global filtering** — `table.setGlobalFilter`, `resetGlobalFilter`, `getGlobalFilterFn` (rows come out of `getFilteredRowModel`)
- **Pagination** — `table.setPageIndex`, `setPageSize`, `nextPage`, `previousPage`, `firstPage`, `lastPage`, `getPageCount`, `getCanNextPage`, `getCanPreviousPage`
- **Row selection** — `table.toggleAllRowsSelected`, `toggleAllPageRowsSelected`, `getIsAllRowsSelected`, `getSelectedRowModel`, `resetRowSelection`; `row.toggleSelected`, `getIsSelected`, `getCanSelect`
- **Grouping** — `table.setGrouping`, `resetGrouping`; `column.toggleGrouping`, `getIsGrouped`; `cell.getIsGrouped`, `getIsAggregated`, `getIsPlaceholder`
- **Expanding** — `table.setExpanded`, `toggleAllRowsExpanded`; `row.toggleExpanded`, `getIsExpanded`, `getCanExpand`, `getToggleExpandedHandler`
- **Visibility** — `table.setColumnVisibility`, `toggleAllColumnsVisible`, `getVisibleLeafColumns`; `column.toggleVisibility`, `getIsVisible`, `getCanHide`
- **Ordering** — `table.setColumnOrder`, `resetColumnOrder`
- **Column pinning** — `table.setColumnPinning`, `getLeftLeafColumns`/center/right (plus header-group and visible-cell variants); `column.pin`, `getIsPinned`, `getStart`, `getAfter`
- **Row pinning** — `table.setRowPinning`, `getTopRows`, `getBottomRows`; `row.pin`, `getIsPinned`
- **Sizing** — `table.setColumnSizing`, `resetColumnSizing`; `column.getSize`, `getIsResizing`; `header.getSize`, `getResizeHandler`
- **Faceting** — `column.getFacetedRowModel`, `getFacetedUniqueValues`, `getFacetedMinMaxValues`; global variants on `table`

## Utilities

- `functionalUpdate(updater, input)` — resolve an `Updater<T>` (value or function) against the current value
- `makeStateUpdater(key, instance)` — build a per-key `onChange` handler that writes through `onStateChange`
- `memo(getDeps, fn, options)` — the dependency-memoization primitive all row models use
- `flattenBy(array, getChildren)`, `isFunction`, `isNumberArray`, `noop`
- `reSplitAlphaNumeric` — the regex behind `alphanumeric` sorting

## Types

All public types are re-exported, including:

- instance shapes: `Table`, `Column`, `Row`, `Cell`, `Header`, `HeaderGroup`, `RowModel`, `RowData`
- options & state: `TableOptions`, `TableState`, `InitialTableState`, `Updater`
- column defs: `ColumnDef`, `AccessorKeyColumnDef`, `AccessorFnColumnDef`, `DisplayColumnDef`, `GroupColumnDef`, `IdentifiedColumnDef`, `ColumnHelper`, `CellContext`, `HeaderContext`
- feature state: `SortingState`, `ColumnFiltersState`, `GlobalFilterState` (via `TableState`), `PaginationState`, `RowSelectionState`, `GroupingState`, `ExpandedState`, `VisibilityState`, `ColumnOrderState`, `ColumnPinningState`, `RowPinningState`, `ColumnSizingState`, `ColumnSizingInfoState`
- functions: `SortingFn`, `FilterFn`, `AggregationFn`, `AccessorFn`, plus `BuiltInSortingFn`, `BuiltInFilterFn`, `BuiltInAggregationFn`

## CDN Global

The IIFE bundle exposes everything under `Domphy.table`:

```html
<script src="https://unpkg.com/@domphy/table/dist/table.global.js"></script>
<script>
    const { createTable, createColumnHelper, getCoreRowModel } = Domphy.table
</script>
```
