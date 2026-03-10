<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputFile from "../../demos/patches/InputFile.ts?raw"

</script>

# Input File

Use the input-file patch to customize this component.

<CodeEditor :code="InputFile" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| inputFile | inherit | inherit | 1 | 1 | 8 | 1 | 1 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputFile.ts [inputFile]
:::


