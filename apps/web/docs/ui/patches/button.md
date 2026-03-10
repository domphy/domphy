<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Button from "../../demos/patches/Button.ts?raw"

</script>

# Button

Use the button patch to customize this component.

<CodeEditor :code="Button" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| button | inherit | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/button.ts [button]
:::


