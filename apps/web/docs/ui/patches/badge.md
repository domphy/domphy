<script setup lang="ts">

import Badge from "../../demos/patches/Badge.ts?raw"

</script>

# Badge

Apply the badge patch to any inline container (typically a `<span>` wrapping an icon or button) to render a small count bubble pinned to its top-right corner via a `::after` pseudo-element. The pill is compact, bold, and ringed with a light hairline so it reads on same-hue surfaces.

## Props

| Prop | Type | Default |
|------|------|---------|
| `color` | `ValueOrState<ThemeColor>` | `"danger"` |
| `label` | `ValueOrState<string \| number>` | `999` |

<CodeEditor :code="Badge" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/badge.ts [badge]
:::




