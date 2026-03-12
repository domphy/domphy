<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Textarea from "../../demos/patches/Textarea.ts?raw"

</script>

# Textarea

Use the textarea patch to customize this component.

<CodeEditor :code="Textarea" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/textarea.ts [textarea]
:::



