<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Preformated from "../../demos/patches/Preformated.ts?raw"

</script>

# Preformated

Use the preformated patch to customize this component.

<CodeEditor :code="Preformated" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| preformated | shift-1 | inherit | n>=2 | 2 | 6n+4 | 2 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/preformated.ts [preformated]
:::


