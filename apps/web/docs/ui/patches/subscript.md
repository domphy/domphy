<script setup lang="ts">

import Subscript from "../../demos/patches/Subscript.ts?raw"

</script>

# Subscript

Renders subscript text (shrunk, baseline-lowered) for the host `<sub>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the text. |

<CodeEditor :code="Subscript" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/subscript.ts [subscript]
:::



