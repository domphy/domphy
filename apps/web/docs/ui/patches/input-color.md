<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputColor from "../../demos/patches/InputColor.ts?raw"

</script>

# Input Color

Styles a native color picker swatch with themed padding, a rounded swatch, and disabled styling. Apply to an `<input type="color">` element — the patch sets `type: "color"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone used for the disabled state background. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone. |

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



