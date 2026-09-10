<script setup lang="ts">

import Tooltip from "../../demos/patches/Tooltip.ts?raw"

</script>

# Tooltip

Use the tooltip patch to customize this element.

The tooltip surface uses a low `elevation()` box-shadow (no outline, kept compact and border-free — the arrow is unbordered too).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `ValueOrState<boolean>` | `false` | Controlled open state (boolean, `State`, or `Computed`/`ReadableState`). When read-only, pass `onDismiss` so leave/blur/Escape can close. |
| `onDismiss` | `() => void` | — | Called when the tooltip requests close. Required to close when `open` is read-only. |
| `placement` | `ValueOrState<Placement>` | `"top"` | Floating placement relative to the trigger element. |
| `content` | `ValueOrState<string>` | `"Tooltip Content"` | Text content rendered inside the tooltip. |

<CodeEditor :code="Tooltip" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tooltip.ts [tooltip]
:::



