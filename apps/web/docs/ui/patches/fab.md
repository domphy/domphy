<script setup lang="ts">

import Fab from "../../demos/patches/Fab.ts?raw"

</script>

# FAB (Floating Action Button)

Apply `fab` to a `<button>` to render a circular elevated button — the standard Material-style primary-action button. Three size presets and full theme-color support.

Uses a low `elevation()` box-shadow at rest, rising to medium on hover.

## Props

| Prop | Type | Default |
|------|------|---------|
| `color` | `ValueOrState<ThemeColor>` | `"primary"` |
| `size` | `"small" \| "medium" \| "large"` | `"medium"` |

<CodeEditor :code="Fab" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/fab.ts [fab]
:::
