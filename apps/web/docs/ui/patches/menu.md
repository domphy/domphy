<script setup lang="ts">

import Menu from "../../demos/patches/Menu.ts?raw"

</script>

# Menu

All-in-one vertical menu. Apply `menu({ items })` to a wrapper element (typically a `<div>`) — it sets `role="menu"` on the wrapper and generates `<button>` `role="menuitem"` children from the `items` array, each wired with keyboard navigation (Arrow&nbsp;/ Home&nbsp;/ End move focus, Enter&nbsp;/ Space activate). Selection is tracked via `activeKey` unless `selectable: false`. Escape hatch: pass `items: []` to keep the wrapper's own children — only the container styling and `role="menu"` semantics apply then.

When used as a floating dropdown (e.g. inside a `popover`), the wrapper carries a `"border-strong"` outline plus a medium `elevation()` box-shadow.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `MenuItem[]` | `[]` | Item definitions `{ label, key?, onClick? }`. `label` is a plain string (auto-wrapped) or any `DomphyElement` (e.g. icon + text); `key` defaults to the item's zero-based index; `onClick` runs when the item is clicked. `[]` keeps the wrapper's own children. |
| `activeKey` | `ValueOrState<number \| string \| null>` | `null` | Currently selected item key. Accepts a plain value or a reactive `State`. |
| `selectable` | `boolean` | `true` | Whether items track and update the active selection on click. |
| `color` | `ThemeColor` | `"neutral"` | Background color tone for the menu. |
| `accentColor` | `ThemeColor` | `"primary"` | Accent color for the active/focus item. |

<CodeEditor :code="Menu" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/menu.ts [menu]
:::



