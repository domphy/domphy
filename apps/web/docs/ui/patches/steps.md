<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Steps from "../../demos/patches/Steps.ts?raw"

</script>

# Steps

Use the steps patch to customize this element.

<CodeEditor :code="Steps" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/steps.ts [steps]
<<< ../../../../../packages/ui/src/patches/stepItem.ts [stepItem]
:::



