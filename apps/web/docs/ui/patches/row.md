<script setup lang="ts">

import Row from "../../demos/patches/Row.ts?raw"

</script>

# Row

Apply the `row` patch to any block element to lay out its children as a horizontal flex row with spacing between them, vertically centered by default — the general-purpose primitive for icon+label rows, field rows, and button groups, instead of hand-rolling `display: flex; alignItems: center; gap: ...`. [toolbar](/docs/ui/patches/toolbar) is a semantic alias of this same shape for headers/nav bars; reach for `row` directly when you need `justify`/`wrap`/a non-center `align`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gap` | `number` | `4` | Spacing multiplier for gap between items. Final gap = `themeSpacing(density × gap)`; at default density (1.5), `gap 4` ≈ `1.5em`. |
| `align` | `"flex-start" \| "center" \| "flex-end" \| "stretch" \| "baseline"` | `"center"` | Cross-axis alignment (`alignItems`). |
| `justify` | `"flex-start" \| "center" \| "flex-end" \| "space-between" \| "space-around" \| "space-evenly"` | unset | Main-axis distribution (`justifyContent`). Left unset by default (flex's own default, `flex-start`). |
| `wrap` | `boolean` | `false` | Allow items to wrap onto multiple lines (`flexWrap: "wrap"`). |

## Example

```ts
import { row } from "@domphy/ui";

const Field = {
  div: [{ label: "Name" }, { input: null, placeholder: "Jane" }],
  $: [row({ justify: "space-between" })],
};
```

<CodeEditor :code="Row" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/row.ts [row]
:::


