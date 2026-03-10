<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Toggle from "../../demos/patches/Toggle.ts?raw"

</script>

# Toggle

Use the toggle patch to customize this component.

<CodeEditor :code="Toggle" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| toggleGroup | n/a | n/a | 0 | 0 | 8 | 1 | 1 | 2 |
| toggle | inherit | inherit | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/toggleGroup.ts [toggleGroup]
<<< ../../../../packages/ui/src/patches/toggle.ts [toggle]
:::
