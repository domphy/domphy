<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Alert from "../../demos/patches/Alert.ts?raw"

</script>

# Alert

Use the alert patch on a `div` to show an inline notification. The `color` prop controls the severity theme — use `primary`, `success`, `warning`, or `error`.

<CodeEditor :code="Alert" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alert | shift-1/shift-7 | inherit | 1 | 2 | 10 | 2 | 4 | — |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/alert.ts [alert]
:::


