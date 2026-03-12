<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Pagination from "../../demos/patches/Pagination.ts?raw"

</script>

# Pagination

Use the `pagination` patch on a `div`. Pass `total` (number of pages) and an optional `value` state for the current page. The patch renders prev/next buttons and numbered page buttons with smart windowing for large page counts.

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



