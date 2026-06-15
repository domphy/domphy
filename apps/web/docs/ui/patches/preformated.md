<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Preformated from "../../demos/patches/Preformated.ts?raw"

</script>

# Preformated

Use the preformated patch to customize this element.

<CodeEditor :code="Preformated" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/preformated.ts [preformated]
:::



