<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Paragraph from "../../demos/patches/Paragraph.ts?raw"

</script>

# Paragraph

Use the paragraph patch to customize this component.

<CodeEditor :code="Paragraph" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/paragraph.ts [paragraph]
:::



