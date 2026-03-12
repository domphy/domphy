<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Emphasis from "../../demos/patches/Emphasis.ts?raw"

</script>

# Emphasis

Use the emphasis patch to customize this component.

<CodeEditor :code="Emphasis" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/emphasis.ts [emphasis]
:::



