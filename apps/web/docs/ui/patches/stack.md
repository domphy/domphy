<script setup lang="ts">

import Stack from "../../demos/patches/Stack.ts?raw"

</script>

# Stack

Apply the `stack` patch to any block element to lay out its children as a vertical flex column with spacing between them — the general-purpose primitive for form sections, panel content, and card bodies, instead of hand-rolling `display: flex; flexDirection: column; gap: ...`. Styles the host only; pair it with [panelSection](/docs/ui/patches/panel-section) for padding or [row](/docs/ui/patches/row) for a nested horizontal group.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `number` | `3` | Spacing multiplier for gap between children. Final gap = `themeSpacing(density × gap)`; at default density (1.5), `gap 3` ≈ `1.125em`. |
| `align` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | unset | Cross-axis alignment (`alignItems`). Left unset by default (flex's own default, `stretch`). |

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


