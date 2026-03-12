<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Details from "../../demos/patches/Details.ts?raw"

</script>

# Details

Use the details patch to customize this component.

<CodeEditor :code="Details" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/details.ts [details]
:::



