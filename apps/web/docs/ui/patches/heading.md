<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Heading from "../../demos/patches/Heading.ts?raw"

</script>

# Heading

Use the heading patch to customize this component.

<CodeEditor :code="Heading" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| heading | inherit | decrease-1..increase-4 | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/heading.ts [heading]
:::


