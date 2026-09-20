<script setup lang="ts">

import Blockquote from "../../demos/patches/Blockquote.ts?raw"

</script>

# Blockquote

Styles a quotation block with a colored inset side bar, padded surface, and shifted tone. Apply to a `<blockquote>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Surface and bar tone. |

<CodeEditor :code="Blockquote" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/blockquote.ts [blockquote]
:::



