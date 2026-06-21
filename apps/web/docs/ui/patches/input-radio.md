<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputRadio from "../../demos/patches/InputRadio.ts?raw"

</script>

# Input Radio

Styles a custom radio button with a themed circular box, checked dot, hover, focus, and disabled states. Apply to an `<input type="radio">` element — the patch sets `type: "radio"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the box border and resting background. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the checked dot and focus ring. |

<CodeEditor :code="InputRadio" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputRadio.ts [inputRadio]
:::



