<script setup lang="ts">

import ToggleGroup from "../../demos/patches/ToggleGroup.ts?raw"

</script>

# Toggle Group

Single- or multi-select button group. Apply `toggleGroup({ items })` to a wrapper — `role="group"` plus generated `<button>` toggles with `aria-pressed`. In single-select mode, clicking the selected item deselects it; `multiple: true` allows several.

Keyboard: ArrowRight/ArrowDown move to the next toggle, ArrowLeft/ArrowUp to the previous (both wrap), Home/End jump to the first/last.

The selection is published on a `toggleGroup` context (`{ value, multiple }`) that descendants can read with `node.getContext("toggleGroup")` — the same `State` the buttons write to, including when `value` was passed as a plain value or omitted.

## Props

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


