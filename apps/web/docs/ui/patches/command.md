<script setup lang="ts">

import Command from "../../demos/patches/Command.ts?raw"

</script>

# Command

Build a command palette with three coordinated patches. Apply `command()` to the outer container — it creates a shared context that carries a live query `State`. Place a `commandSearch()` input inside to wire the text field into that query, then add `commandItem()` entries that hide themselves automatically when their text does not match the current query. Items also check the active query immediately on mount, so items added dynamically after a search is typed are correctly filtered — an item's label is read at filter time, so a reactive label stays in sync.

Keyboard: from anywhere inside the palette (including the search field) ArrowDown/ArrowUp move focus through the **visible** results, wrapping at both ends, Home/End jump to the first/last, and Enter activates the focused item. Filtered-out and `disabled` items are skipped. The walk moves real DOM focus, so items need a focusable host — `<button>`, as in the example below; a bare `<div>` item still filters but needs a `tabindex` of its own to be reachable.

## command

No props. Vertical flex column plus a shared `command` context (`query` State) consumed by `commandSearch` and `commandItem`.

## commandSearch

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Base color tone for the search input. |
| `accentColor` | `ThemeColor` | `"primary"` | Accent color used for the focus border. |

## commandItem

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Base color tone for the item. |
| `accentColor` | `ThemeColor` | `"primary"` | Accent color used for the focus ring. |

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



