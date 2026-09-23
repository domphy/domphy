<script setup lang="ts">

import SelectList from "../../demos/patches/SelectList.ts?raw"

</script>

# Select Item

Use `selectItem` on a `<div>` placed inside a `selectList`. It reads the `select` context to set `aria-selected` and handle click-to-toggle. In single mode the item becomes selected; in multiple mode it toggles its value in the array.

The item is `role="option"` with `tabindex="-1"` — the parent `selectList` owns the tab stop and moves focus between options (see [Select List](./select-list)). The selected row uses the same fill/text pairing as `button({ variant: "solid" })` (deep brand fill + light-end neutral text) so the chosen option's label clears WCAG AA 4.5:1.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number` | `null` | The option value compared against and written to the select state. |
| `color` | `ThemeColor` | `"neutral"` | Text and resting background tone. |
| `accentColor` | `ThemeColor` | `"primary"` | Selected state and focus tone. |

<CodeEditor :code="SelectList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/selectItem.ts [selectItem]
<<< ../../../../../packages/ui/src/patches/selectList.ts [selectList]
:::



