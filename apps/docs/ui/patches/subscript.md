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

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| subscript | inherit | decrease-1 | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/subscript.ts [subscript]
:::
