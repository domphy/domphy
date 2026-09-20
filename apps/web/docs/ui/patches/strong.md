<script setup lang="ts">

import Strong from "../../demos/patches/Strong.ts?raw"

</script>

# Strong

Styles strongly emphasized (bold) text: inherited font size, `font-weight: 700`, and a themed foreground color.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the text. |

<CodeEditor :code="Strong" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/strong.ts [strong]
:::



