<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputSwitch from "../../demos/patches/InputSwitch.ts?raw"

</script>

# Input Switch

Styles a checkbox as a toggle switch: a themed track and sliding knob that animates and recolors on checked, plus a disabled state. Apply to an `<input type="checkbox">` element — the patch sets `type: "checkbox"`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the checked (on) track. |

<CodeEditor :code="InputSwitch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputSwitch.ts [inputSwitch]
:::



