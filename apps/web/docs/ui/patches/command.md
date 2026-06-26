<script setup lang="ts">

import Command from "../../demos/patches/Command.ts?raw"

</script>

# Command

Build a command palette with three coordinated patches. Apply `command()` to the outer container — it creates a shared context that carries a live query `State`. Place a `commandSearch()` input inside to wire the text field into that query, then add `commandItem()` entries that hide themselves automatically when their text does not match the current query. Items also check the active query immediately on mount, so items added dynamically after a search is typed are correctly filtered.

## commandSearch props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Base color tone for the search input. |
| `accentColor` | `ThemeColor` | `"primary"` | Accent color used for the focus border. |

## commandItem props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Base color tone for the item. |
| `accentColor` | `ThemeColor` | `"primary"` | Accent color used for the focus outline. |

<CodeEditor :code="Command" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/command.ts [command]
:::



