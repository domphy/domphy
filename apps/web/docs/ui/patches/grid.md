<script setup lang="ts">

import Grid from "../../demos/patches/Grid.ts?raw"

</script>

# Grid

Apply the `grid` patch to any block element to lay out its children as a CSS grid with a column template and spacing between cells — the general-purpose primitive for card, property, and stat grids, instead of hand-rolling `display: grid; gridTemplateColumns: ...; gap: ...`. Mirrors [row](/docs/ui/patches/row)'s contract. Styles the host only; pair it with [panelSection](/docs/ui/patches/panel-section) for padding or [stack](/docs/ui/patches/stack) for a nested vertical group.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number \| string` | `1` | Column count (expanded to `repeat(N, minmax(0, 1fr))`) or a raw `grid-template-columns` value. |
| `gap` | `number` | `4` | Spacing multiplier for gap between cells. Final gap = `themeSpacing(density × gap)`; at default density (1.5), `gap 4` ≈ `1.5em`. |
| `align` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | unset | Block-axis alignment of items (`alignItems`). Left unset by default. |

## Example

```ts
import { grid } from "@domphy/ui";

const Cards = {
  div: [{ div: "A" }, { div: "B" }],
  $: [grid({ columns: 2 })],
};
```

A raw template is accepted as `columns` when equal tracks are not enough:

```ts
{
  div: [...],
  $: [grid({ columns: "repeat(auto-fill, minmax(12em, 1fr))", gap: 6 })],
}
```

<CodeEditor :code="Grid" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/grid.ts [grid]
:::
