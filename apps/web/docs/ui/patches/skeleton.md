<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Skeleton from "../../demos/patches/Skeleton.ts?raw"

</script>

# Skeleton

Use the skeleton patch on any block element to show a loading placeholder. The animation pulses between full and reduced opacity.

<CodeEditor :code="Skeleton" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| skeleton | shift-2 | — | — | — | 6 | — | — | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/skeleton.ts [skeleton]
:::


