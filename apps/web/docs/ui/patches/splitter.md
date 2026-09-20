<script setup lang="ts">

import Splitter from "../../demos/patches/Splitter.ts?raw"

</script>

# Splitter

Resizable split layout. Apply `splitter` on the container, `splitterPanel` on each panel, `splitterHandle` on the divider.

- `splitterPanel` — binds width (horizontal) or height (vertical) from splitter context. Two panels either side of one handle: the first takes the size percentage, the second takes the complement (always 100%).
- `splitterHandle` — mouse drag and keyboard (Arrow, Home, End) resize; `role="separator"` with `aria-valuenow/min/max`. No props.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `direction` | `"horizontal" \| "vertical"` | `"horizontal"` | Split orientation. |
| `defaultSize` | `number` | `50` | Initial first-panel size (percentage). |
| `min` | `number` | `10` | Minimum panel size (percentage). |
| `max` | `number` | `90` | Maximum panel size (percentage). |

<CodeEditor :code="Splitter" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/splitter.ts [splitter / splitterPanel / splitterHandle]
:::



