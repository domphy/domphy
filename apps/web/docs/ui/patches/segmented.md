<script setup lang="ts">

import Segmented from "../../demos/patches/Segmented.ts?raw"

</script>

# Segmented

Use `segmented` on a wrapper element to build a single-select pill control. It establishes a `segmented` context that child `segmentedItem` buttons read to sync selection. The container has an inline pill style with a muted background.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ValueOrState<string>` | `""` | Initially selected item key. Pass a `State` to control selection externally. |
| `color` | `ThemeColor` | `"neutral"` | Background tone of the pill container. |

<CodeEditor :code="Segmented" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/segmented.ts [segmented]
<<< ../../../../../packages/ui/src/patches/segmentedItem.ts [segmentedItem]
:::


