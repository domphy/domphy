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

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/alert.ts [alert]
:::



