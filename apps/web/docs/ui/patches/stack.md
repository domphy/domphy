<script setup lang="ts">

import Stack from "../../demos/patches/Stack.ts?raw"

</script>

# Stack

Apply the `stack` patch to any block element to lay out its children as a vertical flex column with spacing between them — the general-purpose primitive for form sections, panel content, and card bodies, instead of hand-rolling `display: flex; flexDirection: column; gap: ...`. Styles the host only; pair it with [panelSection](/docs/ui/patches/panel-section) for padding or [row](/docs/ui/patches/row) for a nested horizontal group.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `number` | `3` | Spacing multiplier for gap between children. With `density: true` (default): `themeSpacing(density × gap)` — at default density (1.5), `gap 3` = `1.125em`. With `density: false`: bare `themeSpacing(gap)` — `gap 3` = `0.75em`. |
| `align` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | unset | Cross-axis alignment (`alignItems`). Left unset by default (flex's own default, `stretch`). |
| `justify` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | unset | Main-axis distribution (`justifyContent`). Left unset by default (flex's own default, `flex-start`). |
| `density` | `boolean` | `true` | When `true`, gap is multiplied by theme density (bounded-control mode). When `false`, gap is structural `themeSpacing(n)` with no density multiply — page/form columns, matching AGENTS.md "bare themeSpacing(n)". |

## Example

```ts
import { stack } from "@domphy/ui";

const Panel = {
  div: [{ h3: "Title" }, { p: "Body" }, { button: "Action" }],
  $: [stack({ gap: 2 })],
};
```

<CodeEditor :code="Stack" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/stack.ts [stack]
:::


