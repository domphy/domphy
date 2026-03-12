<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Figure from "../../demos/patches/Figure.ts?raw"

</script>

# Figure

Use the figure patch to customize this component.

<CodeEditor :code="Figure" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/figure.ts [figure]
:::



