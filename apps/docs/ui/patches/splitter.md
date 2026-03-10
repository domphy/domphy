<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Splitter from "../../demos/patches/Splitter.ts?raw"

</script>

# Splitter

Use the splitter patch to customize this component.

<CodeEditor :code="Splitter" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| splitter | n/a | n/a | n>=1 | 2 | — | — | — | — |
| splitterPanel | n/a | n/a | n>=1 | 2 | — | — | — | — |
| splitterHandle | shift-2 | — | — | — | — | — | — | — |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/splitter.ts [splitter]
:::
