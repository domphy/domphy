<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputCheckbox from "../../demos/patches/InputCheckbox.ts?raw"

</script>

# Input Checkbox

Styles a custom checkbox with a themed box, check mark, indeterminate state, hover, focus, and disabled styling. Apply to an `<input type="checkbox">` element — the patch sets `type: "checkbox"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` (or `State`) | `"neutral"` | Theme color tone for the box border and resting background. |
| `accentColor` | `ThemeColor` (or `State`) | `"primary"` | Theme color tone for the checked/indeterminate fill and focus ring. |

<CodeEditor :code="InputCheckbox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputCheckbox.ts [inputCheckbox]
:::



