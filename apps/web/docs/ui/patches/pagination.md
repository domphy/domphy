<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Pagination from "../../demos/patches/Pagination.ts?raw"

</script>

# Pagination

Use `pagination` on a `div`. Pass `total` (required, number of pages) and an optional `value` (a plain number or a `State<number>`) for the current page. The patch internally creates a reactive state if none is provided, renders prev/next arrow buttons and numbered page buttons with smart ellipsis windowing for large page counts. Use `color` to set the base button tone (default `"neutral"`) and `accentColor` for the active page highlight (default `"primary"`).

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



