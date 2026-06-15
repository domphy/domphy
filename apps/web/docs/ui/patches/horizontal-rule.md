<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import HorizontalRule from "../../demos/patches/HorizontalRule.ts?raw"

</script>

# Horizontal Rule

Use the horizontal-rule patch to customize this element.

<CodeEditor :code="HorizontalRule" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/horizontalRule.ts [horizontalRule]
:::



