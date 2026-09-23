<script setup lang="ts">

import Segmented from "../../demos/patches/Segmented.ts?raw"

</script>

# Segmented

All-in-one single-select segmented control. Apply `segmented({ items })` to a wrapper element — it sets `role="radiogroup"` on the wrapper and generates `role="radio"` `<button>` options from the `items` array. The container has an inline pill style with a muted background.

Keyboard follows the WAI-ARIA APG [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) pattern: ArrowRight/ArrowDown move to and check the next segment, ArrowLeft/ArrowUp the previous (both wrap), Home/End jump to the first/last. Roving `tabindex` keeps a single tab stop on the group.

The selected key is published on a `segmented` context (`{ value }`) that descendants can read with `node.getContext("segmented")` — it is the same `State` the buttons write to, including when `value` was passed as a plain string or omitted.

## Props

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


