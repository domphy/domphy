<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Paragraph from "../../demos/patches/Paragraph.ts?raw"

</script>

# Paragraph

Use the paragraph patch to customize this element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Color tone for the paragraph text. |

<CodeEditor :code="Paragraph" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/paragraph.ts [paragraph]
:::



