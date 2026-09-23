<script setup lang="ts">

import InputCheckbox from "../../demos/patches/InputCheckbox.ts?raw"

</script>

# Input Checkbox

Styles a custom checkbox with a themed box, check mark, indeterminate state, hover, focus, and disabled styling. Apply to an `<input type="checkbox">` element — the patch sets `type: "checkbox"`.

Disabled keeps the control's shape and only drops the colour family to neutral (Radix and MUI do the same): the box keeps its outline, so a disabled **unchecked** checkbox still reads as empty. The previous rule filled the box with flat grey and removed the outline, which made a disabled unchecked box look more "on" than an enabled one and indistinguishable from a disabled checked one.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the box border and resting background. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the checked/indeterminate fill and focus ring. |

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



