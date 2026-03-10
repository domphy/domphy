<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Tooltip from "../../demos/patches/Tooltip.ts?raw"

</script>

# Tooltip

Use the tooltip patch to customize this component.

<CodeEditor :code="Tooltip" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tooltip | shift-6 | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/tooltip.ts [tooltip]
:::
