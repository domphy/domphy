<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputColor from "../../demos/patches/InputColor.ts?raw"

</script>

# Input Color

Styles a native color picker swatch with themed padding, a rounded swatch, and disabled styling. Apply to an `<input type="color">` element — the patch sets `type: "color"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Accepted but currently has no visible effect. The disabled state background hardcodes `"neutral"` regardless of this value. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Accepted but currently has no visible effect. No style expression references this prop. |

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



