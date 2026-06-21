<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputNumber from "../../demos/patches/InputNumber.ts?raw"

</script>

# Input Number

Use `inputNumber` on a native `input` element. It styles the browser's built-in number input, including visible spin buttons. Use standard HTML attributes (`min`, `max`, `step`, `value`, `disabled`) directly on the element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for text and border. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the hover/focus ring. |

<CodeEditor :code="InputNumber" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputNumber.ts [inputNumber]
:::



