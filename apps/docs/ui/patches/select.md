<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Select from "../../demos/patches/Select.ts?raw"

</script>

# Select

Use the select patch to customize this component.

<CodeEditor :code="Select" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| select | inherit | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/select.ts [select]
:::
