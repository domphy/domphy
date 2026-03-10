<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputText from "../../demos/patches/InputText.ts?raw"

</script>

# Input Text

Use the input-text patch to customize this component.

<CodeEditor :code="InputText" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputText | inherit | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/inputText.ts [inputText]
:::
