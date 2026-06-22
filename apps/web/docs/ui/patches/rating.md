<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Rating from "../../demos/patches/Rating.ts?raw"

</script>

# Rating

Apply `rating` to a `<div>` to render an interactive star widget. Manages its own star `<button>` children: click to set, arrow keys to adjust, hover to preview. Pass `readOnly` to disable interaction.

## Props

| Prop | Type | Default |
|------|------|---------|
| `value` | `ValueOrState<number>` | `0` |
| `max` | `number` | `5` |
| `onChange` | `(value: number) => void` | — |
| `readOnly` | `boolean` | `false` |
| `color` | `ThemeColor` | `"warning"` |

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
