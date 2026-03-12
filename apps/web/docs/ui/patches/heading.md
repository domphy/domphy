<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Heading from "../../demos/patches/Heading.ts?raw"

</script>

# Heading

Use the heading patch to customize this component.

<CodeEditor :code="Heading" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/heading.ts [heading]
:::



