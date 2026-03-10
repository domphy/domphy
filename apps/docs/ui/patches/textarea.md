<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Textarea from "../../demos/patches/Textarea.ts?raw"

</script>

# Textarea

Use the textarea patch to customize this component.

<CodeEditor :code="Textarea" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| textarea | inherit | inherit | n>=2 | 2 | 6n+4 | 2 | 4 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/textarea.ts [textarea]
:::
