<script setup lang="ts">

import Card from "../../demos/patches/Card.ts?raw"

</script>

# Card

Use `card` on a `div` (any block container). It creates a grid surface with six named regions: `img` (image), heading elements (title), `p` (description), `aside` (aside), `div` (content), and `footer` (footer). Children are auto-placed by element type. The `color` prop controls the surface and border tone.

## Props

| Prop | Type | Default |
|------|------|---------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` |

<CodeEditor :code="Card" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/card.ts [card]
:::



