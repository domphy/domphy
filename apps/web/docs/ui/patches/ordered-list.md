<script setup lang="ts">

import OrderedList from "../../demos/patches/OrderedList.ts?raw"

</script>

# Ordered List

Themed ordered-list primitive: decimal markers positioned outside, reset margins and themed text color. Apply to an `<ol>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the list text. |

<CodeEditor :code="OrderedList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/orderedList.ts [orderedList]
:::



