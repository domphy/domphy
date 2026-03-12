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

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/keyboard.ts [keyboard]
:::



