<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import HorizontalRule from "../../demos/patches/HorizontalRule.ts?raw"

</script>

# Horizontal Rule

Use `horizontalRule` on an `hr` element. It renders a thematic break as a thin 1px themed line with vertical margin. The `color` prop controls the rule color tone.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the rule. |

<CodeEditor :code="HorizontalRule" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/horizontalRule.ts [horizontalRule]
:::



