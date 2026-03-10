<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Spinner from "../../demos/patches/Spinner.ts?raw"

</script>

# Spinner

Use the spinner patch on a `span` to show a circular loading indicator.

<CodeEditor :code="Spinner" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| spinner | shift-3/shift-6 | — | — | — | 6 | — | — | 50% |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/spinner.ts [spinner]
:::


