<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Subscript from "../../demos/patches/Subscript.ts?raw"

</script>

# Subscript

Use the subscript patch to customize this component.

<CodeEditor :code="Subscript" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/subscript.ts [subscript]
:::



