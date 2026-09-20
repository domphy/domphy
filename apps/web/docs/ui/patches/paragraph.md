<script setup lang="ts">

import Paragraph from "../../demos/patches/Paragraph.ts?raw"

</script>

# Paragraph

Themed paragraph primitive: comfortable line-height, reset margins and themed text color. Apply to a `<p>` element.

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



