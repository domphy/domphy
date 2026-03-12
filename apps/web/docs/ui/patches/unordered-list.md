<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import UnorderedList from "../../demos/patches/UnorderedList.ts?raw"

</script>

# Unordered List

Use the unordered-list patch to customize this component.

<CodeEditor :code="UnorderedList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/unorderedList.ts [unorderedList]
:::



