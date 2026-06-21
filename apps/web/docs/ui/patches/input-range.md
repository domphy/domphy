<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputRange from "../../demos/patches/InputRange.ts?raw"

</script>

# Input Range

Styles a range slider with a themed track and thumb, plus hover, focus, and disabled states. Apply to an `<input type="range">` element — the patch sets `type: "range"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the slider track. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the thumb and focus ring. |

<CodeEditor :code="InputRange" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputRange.ts [inputRange]
:::



