<script setup lang="ts">

import SelectList from "../../demos/patches/SelectList.ts?raw"

</script>

# Select List

Use `selectList` on a `div` container and `selectItem` on each child `div`. The container manages shared selection state via context — `selectItem` reads it automatically without any prop wiring.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `multiple` | `boolean` | `false` | Allow multiple selection. When `true`, value defaults to `[]` instead of `null`. |
| `value` | `ValueOrState<Array<number \| string \| null> \| number \| string \| null>` | `[]` / `null` | Bound selection value(s). Defaults to `[]` when `multiple`, otherwise `null`. |
| `color` | `ThemeColor` | `"neutral"` | Background tone of the list container. |
| `name` | `string` | — | Name attribute for the hidden `<input>`(s) injected for form submission. Required for use inside `<form>`. |

<CodeEditor :code="SelectList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/selectList.ts [selectList]
<<< ../../../../../packages/ui/src/patches/selectItem.ts [selectItem]
:::



