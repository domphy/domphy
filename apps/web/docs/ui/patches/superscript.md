<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Superscript from "../../demos/patches/Superscript.ts?raw"

</script>

# Superscript

Use the superscript patch to customize this component.

<CodeEditor :code="Superscript" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| superscript | inherit | decrease-1 | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/superscript.ts [superscript]
:::


