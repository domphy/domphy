<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputSwitch from "../../demos/patches/InputSwitch.ts?raw"

</script>

# Input Switch

Use the input-switch patch to customize this component.

<CodeEditor :code="InputSwitch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputSwitch | increase-2 | inherit | 1 | 0 | 6 | 1 | 0 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputSwitch.ts [inputSwitch]
:::


