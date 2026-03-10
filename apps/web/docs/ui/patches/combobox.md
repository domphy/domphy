<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Combobox from "../../demos/patches/Combobox.ts?raw"

</script>

# Combobox

Use `combobox` on a `div` element. It displays selected values as tags and an input field. The dropdown `content` is built with `selectList` and `selectItem` — state flows automatically through context with no prop drilling.

<CodeEditor :code="Combobox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| combobox | inherit | inherit | 1 | 1 | 8 | 1 | 1 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/combobox.ts [combobox]
:::


