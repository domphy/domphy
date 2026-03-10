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

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| descriptionList | inherit | inherit | n>=1 | 1 | 6n+2 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/descriptionList.ts [descriptionList]
:::


