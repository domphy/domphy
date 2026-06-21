<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Menu from "../../demos/patches/Menu.ts?raw"

</script>

# Menu Item

Use `menuItem` on a `<button>` placed inside a `menu`. It sets `role="menuitem"`, wires click/keyboard selection (Enter/Space activate; Arrow/Home/End move focus between items), and reflects the active item via `aria-current`.

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



