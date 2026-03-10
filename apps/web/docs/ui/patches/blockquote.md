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

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| blockquote | shift-1 | inherit | n>=2 | 2 | 6n+4 | 2 | 5 | 0 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/blockquote.ts [blockquote]
:::


