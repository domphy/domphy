<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputDateTime from "../../demos/patches/InputDateTime.ts?raw"

</script>

# Input Date Time

Styles a native date/time input with themed border, padding, hover, focus, invalid, and disabled states. The `mode` prop selects the input `type`. Apply to an `<input>` element — the patch sets `type` to the chosen `mode`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `"date" \| "time" \| "week" \| "month" \| "datetime-local"` | `"datetime-local"` | Selects the native input `type`. |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for text and border. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the hover/focus ring. |

<CodeEditor :code="InputDateTime" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputDateTime.ts [inputDateTime]
:::



