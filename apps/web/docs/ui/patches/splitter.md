<script setup lang="ts">

import Splitter from "../../demos/patches/Splitter.ts?raw"

</script>

# Splitter

Use `splitter` on a container `div` to create a resizable split layout. It works with two companion patches:

- `splitterPanel` — applied to each panel `div`; reads the splitter context and binds its width (horizontal) or height (vertical) reactively. Meant for exactly two panels either side of one `splitterHandle`: the first one mounted takes the size percentage, the second takes the complement, so the pair always sums to 100% instead of both tracking the same number.
- `splitterHandle` — applied to the divider `div` between panels; handles mouse drag and keyboard (Arrow, Home, End) resize, and sets `role="separator"` with `aria-valuenow/min/max`.

The `direction` prop sets split orientation (`"horizontal"` | `"vertical"`, default `"horizontal"`). The `defaultSize` prop sets the initial first-panel size as a percentage (default `50`). `min` and `max` clamp the draggable range (defaults `10`/`90`).

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



