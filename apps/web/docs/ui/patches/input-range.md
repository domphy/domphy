<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputRange from "../../demos/patches/InputRange.ts?raw"

</script>

# Input Range

Use the input-range patch to customize this component.

<CodeEditor :code="InputRange" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputRange | inherit | inherit | 1 | 0 | 4 | 0 | 0 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputRange.ts [inputRange]
:::


