<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Popover from "../../demos/patches/Popover.ts?raw"

</script>

# Popover

Use the popover patch to customize this component.

<CodeEditor :code="Popover" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| popover | inherit | inherit | n>=1 | 2 | 6n+4 | 2 | 4 | 3 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/popover.ts [popover]
:::


