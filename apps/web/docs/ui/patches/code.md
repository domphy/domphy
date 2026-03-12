<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Code from "../../demos/patches/Code.ts?raw"

</script>

# Code

Use the code patch to customize this component.

<CodeEditor :code="Code" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/code.ts [code]
:::



