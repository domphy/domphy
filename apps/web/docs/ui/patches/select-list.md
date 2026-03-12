<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import SelectList from "../../demos/patches/SelectList.ts?raw"

</script>

# Select List

Use `selectList` on a `div` container and `selectItem` on each child `div`. The container manages shared selection state via context — `selectItem` reads it automatically without any prop wiring.

<CodeEditor :code="SelectList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/selectList.ts [selectList]
<<< ../../../../../packages/ui/src/patches/selectItem.ts [selectItem]
:::



