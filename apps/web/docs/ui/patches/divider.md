<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Divider from "../../demos/patches/Divider.ts?raw"

</script>

# Divider

Use the divider patch to customize this component.

<CodeEditor :code="Divider" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| divider | inherit | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/divider.ts [divider]
:::


