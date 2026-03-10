<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import HorizontalRule from "../../demos/patches/HorizontalRule.ts?raw"

</script>

# Horizontal Rule

Use the horizontal-rule patch to customize this component.

<CodeEditor :code="HorizontalRule" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| horizontalRule | inherit | inherit | 1 | 0 | 1 | 0 | 0 | 0 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/horizontalRule.ts [horizontalRule]
:::


