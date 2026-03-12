<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Command from "../../demos/patches/Command.ts?raw"

</script>

# Command

Use the command patch to customize this component.

<CodeEditor :code="Command" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/command.ts [command]
:::



