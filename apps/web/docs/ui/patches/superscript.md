<script setup lang="ts">

import Superscript from "../../demos/patches/Superscript.ts?raw"

</script>

# Superscript

Renders superscript text (shrunk, baseline-raised) for the host `<sup>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the text. |

<CodeEditor :code="Superscript" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/superscript.ts [superscript]
:::



