<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputColor from "../../demos/patches/InputColor.ts?raw"

</script>

# Input Color

Use the input-color patch to customize this component.

<CodeEditor :code="InputColor" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputColor | inherit | inherit | 1 | 1 | 8 | 1 | 1 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/inputColor.ts [inputColor]
:::
