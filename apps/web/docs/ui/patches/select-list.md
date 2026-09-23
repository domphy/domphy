<script setup lang="ts">

import SelectList from "../../demos/patches/SelectList.ts?raw"

</script>

# Select List

Use `selectList` on a `div` container and `selectItem` on each child `div`. The container manages shared selection state via context — `selectItem` reads it automatically without any prop wiring.

The container is `role="listbox"` and each item `role="option"`. It follows the WAI-ARIA APG [Listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) keyboard model: the listbox itself is the single tab stop (`tabindex="0"`), ArrowDown/ArrowUp move focus between enabled options, Home/End jump to the first/last, and Enter or Space chooses the focused option. Disabled options (`aria-disabled="true"` or `disabled`) are skipped.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `multiple` | `boolean` | `false` | Allow multiple selection. When `true`, value defaults to `[]` instead of `null`. |
| `value` | `ValueOrState<Array<number \| string \| null> \| number \| string \| null>` | `[]` / `null` | Bound selection value(s). Defaults to `[]` when `multiple`, otherwise `null`. |
| `color` | `ThemeColor` | `"neutral"` | Background tone of the list container. |
| `name` | `string` | — | Name attribute for the hidden `<input>`(s) injected for form submission. |

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



