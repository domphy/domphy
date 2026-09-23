<script setup lang="ts">

import Rating from "../../demos/patches/Rating.ts?raw"

</script>

# Rating

Apply `rating` to a `<div>` to render an interactive star widget. Manages its own star `<button>` children: click to set, arrow keys to adjust, hover to preview. Pass `readOnly` to disable interaction.

The host is `role="radiogroup"` and each star a `role="radio"` carrying `aria-checked`, following the WAI-ARIA APG [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) pattern — a screen reader announces which rating is selected, and roving `tabindex` puts a single tab stop on the group. Keyboard: ArrowRight/ArrowUp raise the rating, ArrowLeft/ArrowDown lower it, Home selects 1 star and End selects `max`. `readOnly` also sets `aria-readonly` on the group.

Each star button is at least 24x24 CSS px (WCAG 2.2 SC 2.5.8 Target Size Minimum) regardless of the glyph size.

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
