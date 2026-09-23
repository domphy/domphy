<script setup lang="ts">

import Textarea from "../../demos/patches/Textarea.ts?raw"

</script>

# Textarea

Styles a multi-line text input with themed border, hover, focus, invalid, and disabled states on the host `<textarea>` element. Optionally auto-resizes to fit content.

**Validation styling.** Same contract as `inputText`: the automatic `:invalid` outline requires a `placeholder` that is no longer shown, so a pristine untouched `required` textarea is not painted as an error. Use `data-status="error"` / `data-status="warning"` to drive the state explicitly.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the border and text. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the hover/focus outline. |
| `autoResize` | `boolean` | `false` | When `true`, grows the textarea height to fit its content on input and when `value` updates, and remeasures when the host becomes visible (`IntersectionObserver`) and when its box size changes (`ResizeObserver`). |

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



