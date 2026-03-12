<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Mark from "../../demos/patches/Mark.ts?raw"

</script>

# Mark

Use the mark patch to customize this component.

<CodeEditor :code="Mark" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/mark.ts [mark]
:::



