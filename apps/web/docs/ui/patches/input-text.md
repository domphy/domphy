<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import InputText from "../../demos/patches/InputText.ts?raw"

</script>

# Input Text

Use `inputText` on a native `input` element. It automatically sets `type="text"` and applies themed border, focus ring, placeholder, disabled, and validation (`data-status`) states. Use standard HTML attributes (`placeholder`, `value`, `disabled`) directly on the element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Text/border color tone. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Hover/focus ring color tone. |

<CodeEditor :code="InputText" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputText.ts [inputText]
:::



