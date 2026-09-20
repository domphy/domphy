<script setup lang="ts">

import Small from "../../demos/patches/Small.ts?raw"

</script>

# Small

Styles small/secondary text: one step smaller font size (`data-size="decrease-1"`) with a themed foreground color.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the text. |

<CodeEditor :code="Small" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/small.ts [small]
:::



