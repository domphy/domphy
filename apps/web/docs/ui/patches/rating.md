<script setup lang="ts">

import Rating from "../../demos/patches/Rating.ts?raw"

</script>

# Rating

Apply `rating` to a `<div>` to render an interactive star widget. Manages its own star `<button>` children: click to set, arrow keys to adjust, hover to preview. Pass `readOnly` to disable interaction.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ValueOrState<number>` | `0` | Current rating (0 – `max`). |
| `max` | `number` | `5` | Total number of stars. |
| `onChange` | `(value: number) => void` | — | Called with the new value when the user picks a star. |
| `readOnly` | `boolean` | `false` | Disable interaction. |
| `color` | `ThemeColor` | `"warning"` | Star color tone. |

<CodeEditor :code="Rating" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/rating.ts [rating]
:::
