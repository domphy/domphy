<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputDateTime from "../../demos/patches/InputDateTime.ts?raw"

</script>

# Input Date Time

Use the input-date-time patch to customize this component.

<CodeEditor :code="InputDateTime" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputDateTime.ts [inputDateTime]
:::



