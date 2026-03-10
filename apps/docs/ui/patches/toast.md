<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Toast from "../../demos/patches/Toast.ts?raw"

</script>

# Toast

Use the toast patch to customize this component.

<CodeEditor :code="Toast" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| toast | inherit | inherit | n>=1 | 2 | 6n+4 | 2 | 4 | 3 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/toast.ts [toast]
:::
