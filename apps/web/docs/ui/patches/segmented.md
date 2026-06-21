<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Segmented from "../../demos/patches/Segmented.ts?raw"

</script>

# Segmented

Use the segmented patch to customize this element. Pair with `segmentedItem` patches on child `<button>` elements to build a single-select pill control.

<CodeEditor :code="Segmented" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/segmented.ts [segmented]
<<< ../../../../../packages/ui/src/patches/segmentedItem.ts [segmentedItem]
:::


