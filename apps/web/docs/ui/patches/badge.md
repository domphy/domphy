<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Badge from "../../demos/patches/Badge.ts?raw"

</script>

# Badge

Use the badge patch to customize this component.

<CodeEditor :code="Badge" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| badge | inherit | decrease-1 | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/badge.ts [badge]
:::



