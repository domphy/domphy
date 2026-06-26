<script setup lang="ts">

import SelectBox from "../../demos/patches/SelectBox.ts?raw"

</script>

# Select Box

Use `selectBox` on a `div` element. It displays selected values as tags and opens a dropdown on click. The dropdown `content` is built with `selectList` and `selectItem` — state flows automatically through context with no prop drilling.

Unlike `combobox`, `selectBox` has no input field — it is suited for fixed option lists without search.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `DomphyElement` | *(required)* | The popover/dropdown content element shown when open. Typically a `div` with `selectList` + `selectItem` children. |
| `options` | `Array<{ label: string; value: string }>` | `[]` | Option list used to resolve selected values into tag labels displayed in the box. |
| `multiple` | `boolean` | `false` | Allow multiple selection. When `true`, selected values are shown as removable tags and the popover stays open on item click. |
| `value` | `ValueOrState<Array<number \| string \| null \| undefined> \| number \| string \| null \| undefined>` | — | Bound selection value(s). |
| `placement` | `ValueOrState<Placement>` | `"bottom"` | Floating placement of the dropdown popover. |
| `color` | `ThemeColor` | `"neutral"` | Text and background tone of the trigger box. |
| `open` | `ValueOrState<boolean>` | `false` | Controls whether the popover is open. |

<CodeEditor :code="SelectBox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/selectBox.ts [selectBox]
:::



