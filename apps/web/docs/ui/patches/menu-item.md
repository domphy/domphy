<script setup lang="ts">

import Menu from "../../demos/patches/Menu.ts?raw"

</script>

# Menu Item

Use `menuItem` on a `<button>` placed inside a `menu`. It sets `role="menuitem"`, wires keyboard navigation (Enter/Space activate; Arrow/Home/End move focus between items). Selection tracking (`aria-current`, click-to-activate) is only wired when the parent `menu` has `selectable: true` (the default). With `selectable: false`, only keyboard navigation is active.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ThemeColor` | `"neutral"` | Base text and background tone for the item. |
| `accentColor` | `ThemeColor` | `"primary"` | Active/focus indicator tone. |

<CodeEditor :code="Menu" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/menuItem.ts [menuItem]
<<< ../../../../../packages/ui/src/patches/menu.ts [menu]
:::



