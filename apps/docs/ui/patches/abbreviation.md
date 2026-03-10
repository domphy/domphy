<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Abbreviation from "../../demos/patches/Abbreviation.ts?raw"

</script>

# Abbreviation

Use the abbreviation patch to customize this component.

<CodeEditor :code="Abbreviation" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| abbreviation | inherit | inherit | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/abbreviation.ts [abbreviation]
:::
