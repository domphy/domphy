<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Command from "../../demos/patches/Command.ts?raw"

</script>

# Command

Use the command patch to customize this component.

<CodeEditor :code="Command" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| command | n/a | n/a | c>=1 | 2 | — | — | — | — |
| commandSearch | inherit | inherit | 1 | 2 | 10 | 2 | 3 | — |
| commandItem | inherit | inherit | 1 | 0 | 8 | 0 | 3 | — |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/command.ts [command]
:::
