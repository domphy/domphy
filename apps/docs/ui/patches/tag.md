<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Tag from "../../demos/patches/Tag.ts?raw"

</script>

# Tag

Use the tag patch to customize this component.

<CodeEditor :code="Tag" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tag | shift-1 | inherit | 1 | 0 | 6 | 0 | 3 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/tag.ts [tag]
:::
