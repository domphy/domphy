---
title: "Faceting & Filter UI"
description: "Compute unique values and ranges for building filter dropdowns, checkboxes, and sliders."
---

# Faceting & Filter UI

Faceting extracts unique values or min/max ranges from column data — the inputs you need to build filter controls like dropdowns, multi-select checkboxes, and range sliders.

## Column faceting — unique values

Enable `getFacetedUniqueValues()` for a column to get a `Map<value, count>`:

```ts
import { createDomphyTable } from "@domphy/table/domphy"

const table = createDomphyTable({
  data: () => products,
  columns: [
    columnHelper.accessor("category", {
      header: "Category",
      filterFn: "arrIncludesSome",   // matches multi-select filter
      meta: { facet: true },
    }),
    columnHelper.accessor("brand",    { header: "Brand" }),
    columnHelper.accessor("price",    { header: "Price" }),
  ],
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  getFacetedMinMaxValues: getFacetedMinMaxValues(),
})
```

## Building a checkbox filter from unique values

```ts
import { toState } from "@domphy/core"

const selectedCategories = toState<string[]>([])

const CategoryFilter = {
  div: [
    { h3: "Category" },
    {
      div: (l) => {
        const col = table.table.getColumn("category")!
        const facetMap = col.getFacetedUniqueValues()
        return [...facetMap.entries()].map(([value, count]) => ({
          _key: String(value),
          label: [
            {
              input: null,
              type: "checkbox",
              checked: (l) => selectedCategories.get(l).includes(String(value)),
              onChange: (e: Event) => {
                const checked = (e.target as HTMLInputElement).checked
                const cat = String(value)
                const current = selectedCategories.get()
                selectedCategories.set(checked ? [...current, cat] : current.filter((c) => c !== cat))
                // Apply filter to table
                col.setFilterValue(selectedCategories.get() || undefined)
              },
            },
            { span: `${value} (${count})` },
          ],
        }))
      },
    },
  ],
}
```

## Min/max range filter (price slider)

```ts
import { toState } from "@domphy/core"

const priceRange = toState<[number, number]>([0, 10000])

// Initialize from facet data after mount
function initPriceFilter() {
  const col = table.table.getColumn("price")!
  const [min, max] = col.getFacetedMinMaxValues() ?? [0, 10000]
  priceRange.set([min, max])
}

const PriceRangeFilter = {
  div: [
    { h3: "Price" },
    {
      div: [
        {
          input: null,
          type: "range",
          min: (l) => String(priceRange.get(l)[0]),
          max: (l) => String(priceRange.get(l)[1]),
          value: (l) => String(priceRange.get(l)[0]),
          onInput: (e: Event) => {
            const min = Number((e.target as HTMLInputElement).value)
            priceRange.set(([_, max]) => [min, max])
            table.table.getColumn("price")?.setFilterValue(priceRange.get())
          },
        },
        {
          span: (l) => `$${priceRange.get(l)[0]} — $${priceRange.get(l)[1]}`,
        },
      ],
    },
  ],
  _onMount: initPriceFilter,
}
```

## Global faceting

`getFacetedUniqueValues()` per column looks at filtered rows by default. To always show ALL values (even when filtered out), use global faceting:

```ts
import { getFacetedRowModel, getFacetedUniqueValues } from "@domphy/table"

const table = createDomphyTable({
  data: () => products,
  columns,
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  // Pass the pre-filter row model for global (unfiltered) facets
  // table.table.getPreFilteredRowModel() in custom facet function
})
```

## Faceting API

| Method | Returns | Description |
|--------|---------|-------------|
| `column.getFacetedRowModel()` | `RowModel` | Rows before this column's filter is applied |
| `column.getFacetedUniqueValues()` | `Map<any, number>` | Unique values + counts |
| `column.getFacetedMinMaxValues()` | `[min, max] \| undefined` | Min/max for number columns |

## Active filter indicator

Show a badge or indicator when a filter is active:

```ts
const FilterBadge = (columnId: string) => {
  const col = table.table.getColumn(columnId)!
  return {
    span: "●",
    hidden: (l) => !col.getIsFiltered(),
    style: { color: "var(--accent-5)", marginLeft: "4px" },
    title: (l) => `Filtered: ${JSON.stringify(col.getFilterValue())}`,
  }
}

// Usage in column header
const Header = (col: HeaderCell) => ({
  th: [
    { span: String(col.columnDef.header ?? "") },
    FilterBadge(col.id),
  ],
})
```

## Resetting all filters

```ts
const ClearFilters = {
  button: "Clear all filters",
  onClick: () => table.table.resetColumnFilters(),
  hidden: (l) => !table.table.getState().columnFilters.length,
}
```
