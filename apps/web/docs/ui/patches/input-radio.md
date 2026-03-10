<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputRadio from "../../demos/patches/InputRadio.ts?raw"

</script>

# Input Radio

Use the input-radio patch to customize this component.

<CodeEditor :code="InputRadio" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputRadio | inherit | inherit | 1 | 0 | 6 | 0 | 0 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputRadio.ts [inputRadio]
:::


