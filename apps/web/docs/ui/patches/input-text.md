<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputText from "../../demos/patches/InputText.ts?raw"

</script>

# Input Text

Use the input-text patch to customize this component.

<CodeEditor :code="InputText" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputText.ts [inputText]
:::



