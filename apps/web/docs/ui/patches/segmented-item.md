<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Segmented from "../../demos/patches/Segmented.ts?raw"

</script>

# Segmented Item

Use the segmentedItem patch to customize this element. Apply to a `<button>` placed inside a `segmented` control.

<CodeEditor :code="Segmented" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/segmentedItem.ts [segmentedItem]
<<< ../../../../../packages/ui/src/patches/segmented.ts [segmented]
:::


