<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputSearch from "../../demos/patches/InputSearch.ts?raw"

</script>

# Input Search

Use the input-search patch to customize this component.

<CodeEditor :code="InputSearch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputSearch.ts [inputSearch]
:::



