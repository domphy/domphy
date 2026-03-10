<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputNumber from "../../demos/patches/InputNumber.ts?raw"

</script>

# Input Number

Use `inputNumber` on a native `input` element. It styles the browser's built-in number input, including the spin buttons. Use standard HTML attributes (`min`, `max`, `step`, `value`, `disabled`) directly on the element.

<CodeEditor :code="InputNumber" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputNumber | inherit | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/inputNumber.ts [inputNumber]
:::
