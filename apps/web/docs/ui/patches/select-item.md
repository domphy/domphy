<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import SelectList from "../../demos/patches/SelectList.ts?raw"

</script>

# Select Item

Use `selectItem` on a `div` placed inside a `selectList`. It reads the `select` context provided by the parent to reflect and toggle selection state — no manual prop wiring needed.

<CodeEditor :code="SelectList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/selectItem.ts [selectItem]
<<< ../../../../../packages/ui/src/patches/selectList.ts [selectList]
:::



