<script setup lang="ts">

import List from "../../demos/patches/List.ts?raw"

</script>

# List

Three composable patches for navigation and display lists. Apply `list` to the `<ul>` container, `listItem` to non-interactive `<li>` rows, and `listItemButton` to interactive `<button>` or `<a>` elements inside each row. Set `aria-selected="true"` or `aria-current="page"` to highlight the active item.

## list

| Prop | Type | Default |
|------|------|---------|
| `color` | `ThemeColor` | `"neutral"` |

## listItem

| Prop | Type | Default |
|------|------|---------|
| `dense` | `boolean` | `false` |

## listItemButton

| Prop | Type | Default |
|------|------|---------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` |
| `accentColor` | `ThemeColor` | `"primary"` |
| `dense` | `boolean` | `false` |

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
