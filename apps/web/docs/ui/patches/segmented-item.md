<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Segmented from "../../demos/patches/Segmented.ts?raw"

</script>

# Segmented Item

Use `segmentedItem` on a `<button>` placed inside a `segmented` control. It reads the parent `segmented` context, sets `aria-checked`, and handles click-to-select. Use `_key` on each button to set its selection key; otherwise the index is used.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Resting text and hover background tone. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Selected state background and focus-outline tone. |

<CodeEditor :code="Segmented" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/segmentedItem.ts [segmentedItem]
<<< ../../../../../packages/ui/src/patches/segmented.ts [segmented]
:::


