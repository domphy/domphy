<script setup lang="ts">

import Divider from "../../demos/patches/Divider.ts?raw"

</script>

# Divider

Horizontal labelled separator (`role="separator"`) — a line on each side of the host's text, e.g. an "or" divider.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the label text and rules. |

<CodeEditor :code="Divider" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/divider.ts [divider]
:::



