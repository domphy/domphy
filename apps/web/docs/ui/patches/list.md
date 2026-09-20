<script setup lang="ts">

import List from "../../demos/patches/List.ts?raw"

</script>

# List

Three composable patches for navigation and display lists. Apply `list` to the `<ul>` container, `listItem` to non-interactive `<li>` rows, and `listItemButton` to interactive `<button>` or `<a>` elements inside each row. Highlight the active row by setting `aria-selected="true"` or `aria-current="page"` on the `listItemButton` host — not on the `<li>`.

## list props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ThemeColor` | `"neutral"` | Surface color tone. |

## listItem props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dense` | `boolean` | `false` | Reduce vertical padding. |

## listItemButton props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Color tone. |
| `accentColor` | `ThemeColor` | `"primary"` | Focus/active accent. |
| `dense` | `boolean` | `false` | Reduce vertical padding. |

<CodeEditor :code="List" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/list.ts [list / listItem / listItemButton]
:::
