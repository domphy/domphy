<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Steps from "../../demos/patches/Steps.ts?raw"

</script>

# Step Item

Use the stepItem patch to customize this element. Apply to a `<li>` placed inside a `steps` container. The element's text content becomes the step label.

<CodeEditor :code="Steps" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/stepItem.ts [stepItem]
<<< ../../../../../packages/ui/src/patches/steps.ts [steps]
:::



