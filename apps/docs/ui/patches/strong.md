<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Strong from "../../demos/patches/Strong.ts?raw"

</script>

# Strong

Use the strong patch to customize this component.

<CodeEditor :code="Strong" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| strong | inherit | inherit | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/strong.ts [strong]
:::
