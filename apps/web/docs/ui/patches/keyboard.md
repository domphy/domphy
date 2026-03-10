<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Keyboard from "../../demos/patches/Keyboard.ts?raw"

</script>

# Keyboard

Use the keyboard patch to customize this component.

<CodeEditor :code="Keyboard" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| keyboard | inherit | inherit | 1 | 0.5 | 7 | 0.5 | 1.5 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/keyboard.ts [keyboard]
:::


