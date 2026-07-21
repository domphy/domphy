<script setup lang="ts">

import Empty from "../../demos/patches/Empty.ts?raw"

</script>

# Empty

Use `empty` on a container to display an empty-state placeholder. It centers children in a flex column with muted coloring and comfortable padding. Hierarchy: first child (icon) is softest, second child (title) uses body text contrast, remaining children stay muted.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Color tone for the muted text and icon. |

<CodeEditor :code="Empty" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/empty.ts [empty]
:::



