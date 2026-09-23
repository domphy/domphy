<script setup lang="ts">

import Pagination from "../../demos/patches/Pagination.ts?raw"

</script>

# Pagination

Use `pagination` on a `div`. Pass `total` (required, number of pages) and an optional `value` (a plain number or a `State<number>`) for the current page. The patch internally creates a reactive state if none is provided, renders prev/next arrow buttons and numbered page buttons with smart ellipsis windowing for large page counts. The current page is marked with `aria-current="page"` and stays focusable (only prev/next are disabled at the bounds) so keyboard focus is not dropped when the page changes. Use `color` to set the base button tone (default `"neutral"`) and `accentColor` for the active page highlight (default `"primary"`).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ValueOrState<number>` | `1` | Current page (1-based). Accepts a plain number or a reactive `State`. |
| `total` | `number` | — | Total number of pages. Required. |
| `color` | `ThemeColor` | `"neutral"` | Base color tone for the page buttons. |
| `accentColor` | `ThemeColor` | `"primary"` | Accent color tone for the active page button. |

<CodeEditor :code="Pagination" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/pagination.ts [pagination]
:::



