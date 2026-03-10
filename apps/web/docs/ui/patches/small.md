<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Small from "../../demos/patches/Small.ts?raw"

</script>

# Small

Use the small patch to customize this component.

<CodeEditor :code="Small" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| small | inherit | decrease-1 | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/small.ts [small]
:::


