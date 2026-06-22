<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import SelectList from "../../demos/patches/SelectList.ts?raw"

</script>

# Select Item

Use `selectItem` on a `<div>` placed inside a `selectList`. It reads the `select` context to set `aria-selected` and handle click-to-toggle. In single mode the item becomes selected; in multiple mode it toggles its value in the array.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| number` | `undefined` | The option value compared against and written to the select state. Omitting the prop leaves value as null/unset at runtime. |
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



