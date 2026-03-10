<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Mark from "../../demos/patches/Mark.ts?raw"

</script>

# Mark

Use the mark patch to customize this component.

<CodeEditor :code="Mark" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mark | shift-1 | inherit | 1 | 0.5 | 7 | 0.5 | 1.5 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/mark.ts [mark]
:::
