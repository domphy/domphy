<script setup lang="ts">

import Emphasis from "../../demos/patches/Emphasis.ts?raw"

</script>

# Emphasis

Italic emphasized inline text. Apply to an `<em>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the text. |

<CodeEditor :code="Emphasis" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/emphasis.ts [emphasis]
:::



