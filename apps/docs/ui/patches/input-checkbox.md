<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputCheckbox from "../../demos/patches/InputCheckbox.ts?raw"

</script>

# Input Checkbox

Use the input-checkbox patch to customize this component.

<CodeEditor :code="InputCheckbox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputCheckbox | inherit | inherit | 1 | 0 | 6 | 0 | 0 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/inputCheckbox.ts [inputCheckbox]
:::
