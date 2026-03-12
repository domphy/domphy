<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import SelectBox from "../../demos/patches/SelectBox.ts?raw"

</script>

# Select Box

Use `selectBox` on a `div` element. It displays selected values as tags and opens a dropdown on click. The dropdown `content` is built with `selectList` and `selectItem` — state flows automatically through context with no prop drilling.

Unlike `combobox`, `selectBox` has no input field — it is suited for fixed option lists without search.

<CodeEditor :code="SelectBox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/selectBox.ts [selectBox]
:::



