<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Dialog from "../../demos/patches/Dialog.ts?raw"

</script>

# Dialog

Use the dialog patch to customize this component.

<CodeEditor :code="Dialog" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dialog | inherit | inherit | n>=2 | 3 | 6n+6 | 3 | 3 | 4 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/dialog.ts [dialog]
:::


