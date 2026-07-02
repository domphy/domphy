<script setup lang="ts">

import ToggleGroup from "../../demos/patches/ToggleGroup.ts?raw"

</script>

# Toggle Group

All-in-one toggle group — a single- or multi-select button group. Apply `toggleGroup({ items })` to a wrapper element — it sets `role="group"` on the wrapper and generates `<button>` toggles with `aria-pressed` from the `items` array. In single-select mode, clicking the selected item again deselects it; set `multiple: true` to allow several items at once.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ToggleItem[]` | `[]` | Item definitions `{ label, key? }`. `label` is a plain string (auto-wrapped) or any `DomphyElement`; `key` defaults to the item's zero-based index as a string. |
| `value` | `ValueOrState<string \| string[]>` | `""` (single) or `[]` (multiple) | Selected key(s). Pass a `State` to control selection externally. |
| `multiple` | `boolean` | `false` | Allow multiple toggles selected at once. |
| `color` | `ThemeColor` | `"neutral"` | Background and border tone for the group. |
| `accentColor` | `ThemeColor` | `"primary"` | Color tone for the pressed state. |

<CodeEditor :code="ToggleGroup" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/toggleGroup.ts [toggleGroup]
:::


