<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Textarea from "../../demos/patches/Textarea.ts?raw"

</script>

# Textarea

Styles a multi-line text input with themed border, hover, focus, invalid, and disabled states on the host `<textarea>` element. Optionally auto-resizes to fit content.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` (or `State`) | `"neutral"` | Theme color tone for the border and text. |
| `accentColor` | `ThemeColor` (or `State`) | `"primary"` | Theme color tone for the hover/focus outline. |
| `autoResize` | `boolean` | `false` | When `true`, grows the textarea height to fit its content on input. |

<CodeEditor :code="Textarea" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/textarea.ts [textarea]
:::



