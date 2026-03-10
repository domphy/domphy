<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import ButtonSwitch from "../../demos/patches/ButtonSwitch.ts?raw"

</script>

# Button Switch

Use the button-switch patch to customize this component.

<CodeEditor :code="ButtonSwitch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| buttonSwitch | increase-2 | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/buttonSwitch.ts [buttonSwitch]
:::
