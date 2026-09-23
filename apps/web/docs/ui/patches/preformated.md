<script setup lang="ts">

import Preformated from "../../demos/patches/Preformated.ts?raw"

</script>

# Preformated

Styles a preformatted text block: inherited font size, the theme's monospace stack, themed foreground/background, no border, density-scaled padding and rounded corners.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for text and background. |

<CodeEditor :code="Preformated" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/preformated.ts [preformated]
:::



