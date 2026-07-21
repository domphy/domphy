<script setup lang="ts">

import Button from "../../demos/patches/Button.ts?raw"

</script>

# Button

Use the button patch to customize this element. Interactive states: hover (`±1`), pressed `:active` (`±2`), focus-visible ring via the shared `focusRing` helper, plus `[disabled]` and `[aria-busy]`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"primary"` | Button color tone. |
| `variant` | `"solid" \| "outline" \| "ghost"` | `"outline"` | Visual style. `"outline"` is the tinted-background + outline look and stays the default for backward compatibility. `"solid"` fills the background with a readable-contrast text color. `"ghost"` delegates straight to `buttonGhost()`, so the two stay visually identical. |
| `size` | `"small" \| "medium" \| "large"` | `"medium"` | Button size preset — scales padding and font size via the density/size tokens. |

<CodeEditor :code="Button" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/button.ts [button]
:::



