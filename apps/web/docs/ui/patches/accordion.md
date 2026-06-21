<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Accordion from "../../demos/patches/Accordion.ts?raw"

</script>

# Accordion

Use the accordion patch to customize this element.

<CodeEditor :code="Accordion" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/accordion.ts [accordion]
<<< ../../../../../packages/ui/src/patches/details.ts [details]
:::



