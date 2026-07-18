<script setup lang="ts">

import PanelSection from "../../demos/patches/PanelSection.ts?raw"

</script>

# Panel Section

Apply the `panelSection` patch to any block element for the padded-section chrome common to side-panel and inspector UIs: density-aware padding on all sides, with an optional bottom divider for sections stacked one after another. It's a thin wrapper — it does not impose flex layout on its children, so pair it with [stack](/docs/ui/patches/stack) or [row](/docs/ui/patches/row) for that.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `padding` | `number` | `4` | Spacing multiplier for padding on all sides. Final padding = `themeSpacing(density × padding)`; at default density (1.5), `padding 4` ≈ `1.5em`. |
| `divider` | `boolean` | `false` | Adds a bottom border, for sections stacked one after another. |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the divider border. |

## Example

```ts
import { panelSection, stack } from "@domphy/ui";

const Sidebar = {
  div: [
    { div: [{ h4: "Parameters" }, { p: "..." }], $: [stack({ gap: 1 }), panelSection({ divider: true })] },
    { div: [{ h4: "Operations" }, { p: "..." }], $: [stack({ gap: 1 }), panelSection()] },
  ],
  $: [stack({ gap: 0 })],
};
```

<CodeEditor :code="PanelSection" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/panelSection.ts [panelSection]
:::


