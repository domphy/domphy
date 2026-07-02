<script setup lang="ts">

import Segmented from "../../demos/patches/Segmented.ts?raw"

</script>

# Segmented

All-in-one single-select segmented control. Apply `segmented({ items })` to a wrapper element — it sets `role="radiogroup"` on the wrapper and generates `role="radio"` `<button>` options from the `items` array. The container has an inline pill style with a muted background.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `SegmentedItem[]` | `[]` | Item definitions `{ label, key? }`. `label` is a plain string (auto-wrapped) or any `DomphyElement`; `key` defaults to the item's zero-based index as a string. |
| `value` | `ValueOrState<string>` | first item's key | Initially selected key. Pass a `State` to control selection externally. |
| `color` | `ThemeColor` | `"neutral"` | Background tone of the pill container. |
| `accentColor` | `ThemeColor` | `"primary"` | Color tone for the selected item. |

<CodeEditor :code="Segmented" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/segmented.ts [segmented]
:::


