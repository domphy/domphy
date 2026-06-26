<script setup lang="ts">

import PopoverArrow from "../../demos/patches/PopoverArrow.ts?raw"

</script>

# Popover Arrow

Apply the popoverArrow patch to a floating popover container to add a small rotated arrow (rendered via `::after`) that points toward the anchor element. Pass `placement` matching the popover's floating placement — the arrow is automatically drawn on the opposite side. Use `color` to match the popover surface and `bordered` to control whether the arrow has a 1&nbsp;px border. Use `sideOffset` (a CSS length string, default `themeSpacing(6)`) to adjust how far the arrow is offset toward the start or end edge.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `placement` | `ValueOrState<Placement>` | `"bottom-end"` | Floating placement the popover sits at. The arrow is drawn on the opposite (flipped) side. |
| `sideOffset` | `string` | `themeSpacing(6)` | CSS length used to offset the arrow toward the start or end edge. |
| `color` | `ThemeColor` | `"neutral"` | Theme color tone for the arrow fill and border. |
| `bordered` | `boolean` | `true` | Whether the arrow draws a 1&nbsp;px border. |

<CodeEditor :code="PopoverArrow" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/popoverArrow.ts [popoverArrow]
:::




