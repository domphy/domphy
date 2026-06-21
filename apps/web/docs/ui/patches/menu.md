<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Menu from "../../demos/patches/Menu.ts?raw"

</script>

# Menu

Apply the `menu()` patch to a container (typically a `<div>`) to create a vertical navigation menu with `role="menu"`. Pair it with `menuItem()` on each `<button>` child — items wire keyboard navigation (Arrow&nbsp;/ Home&nbsp;/ End) and track the active selection via `activeKey`. Use `selectable: false` to disable selection tracking when you only need keyboard navigation.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activeKey` | `ValueOrState<number \| string>` | `null` | Currently selected item key. Accepts a plain value or a reactive `State`. |
| `selectable` | `boolean` | `true` | Whether items track and update the active selection on click. |
| `color` | `ThemeColor` | `"neutral"` | Background color tone for the menu container. |

<CodeEditor :code="Menu" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/menu.ts [menu]
<<< ../../../../../packages/ui/src/patches/menuItem.ts [menuItem]
:::



