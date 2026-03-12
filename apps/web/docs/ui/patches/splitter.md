<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Splitter from "../../demos/patches/Splitter.ts?raw"

</script>

# Splitter

Use the splitter patch to customize this component.

<CodeEditor :code="Splitter" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/splitter.ts [splitter]
:::



