<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Link from "../../demos/patches/Link.ts?raw"

</script>

# Link

Use the link patch to customize this component.

<CodeEditor :code="Link" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| link | inherit | inherit | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/link.ts [link]
:::
