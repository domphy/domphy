<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import DescriptionList from "../../demos/patches/DescriptionList.ts?raw"

</script>

# Description List

Use the description-list patch to customize this component.

<CodeEditor :code="DescriptionList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/descriptionList.ts [descriptionList]
:::



