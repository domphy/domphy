<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Blockquote from "../../demos/patches/Blockquote.ts?raw"

</script>

# Blockquote

Use the blockquote patch to customize this component.

<CodeEditor :code="Blockquote" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/blockquote.ts [blockquote]
:::



