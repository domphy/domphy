<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Label from "../../demos/patches/Label.ts?raw"

</script>

# Label

Use the label patch to customize this component.

<CodeEditor :code="Label" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| label | inherit | inherit | 1 | 0 | 6 | 0 | 2 | 1 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/label.ts [label]
:::


