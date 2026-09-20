<script setup lang="ts">

import InputColor from "../../demos/patches/InputColor.ts?raw"

</script>

# Input Color

Styles a native color picker swatch with themed padding, a rounded swatch, and disabled styling. Apply to an `<input type="color">` element — the patch sets `type: "color"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for text and the focus ring. Disabled background and outline still use `"neutral"`. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Accepted on the options type but unused by the shipped styles. |

<CodeEditor :code="InputColor" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputColor.ts [inputColor]
:::



