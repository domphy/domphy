<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Progress from "../../demos/patches/Progress.ts?raw"

</script>

# Progress

Use the progress patch to customize this component.

<CodeEditor :code="Progress" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| progress | shift-2 | inherit | 1 | 0 | 2 | 0 | 0 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/progress.ts [progress]
:::


