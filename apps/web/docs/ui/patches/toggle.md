<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Toggle from "../../demos/patches/Toggle.ts?raw"

</script>

# Toggle

Use the toggle patch to customize this component.

<CodeEditor :code="Toggle" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/toggleGroup.ts [toggleGroup]
<<< ../../../../../packages/ui/src/patches/toggle.ts [toggle]
:::



