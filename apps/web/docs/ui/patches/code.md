<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Code from "../../demos/patches/Code.ts?raw"

</script>

# Code

Use the code patch to customize this component.

<CodeEditor :code="Code" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| code | shift-2 | inherit | 1 | 0.5 | 7 | 0.5 | 1.5 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/code.ts [code]
:::


