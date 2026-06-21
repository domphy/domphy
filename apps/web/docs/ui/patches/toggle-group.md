<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import ToggleGroup from "../../demos/patches/ToggleGroup.ts?raw"

</script>

# Toggle Group

Use the `toggleGroup` patch on a wrapper element and `toggle` patches on child `<button>` elements to build a segmented toggle control. Supports single-select and multi-select modes.

<CodeEditor :code="ToggleGroup" />

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


