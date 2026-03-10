<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import OrderedList from "../../demos/patches/OrderedList.ts?raw"

</script>

# Ordered List

Use the ordered-list patch to customize this component.

<CodeEditor :code="OrderedList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| orderedList | inherit | inherit | n>=1 | 0 | 6n | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/orderedList.ts [orderedList]
:::


