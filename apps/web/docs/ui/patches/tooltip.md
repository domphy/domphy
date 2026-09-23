<script setup lang="ts">

import Tooltip from "../../demos/patches/Tooltip.ts?raw"

</script>

# Tooltip

Attaches a floating tooltip to the host element, shown on hover/focus and hidden on leave/blur/Escape. Returns the anchor (trigger) partial; the tooltip surface is positioned via the floating utility and linked with `aria-describedby`. No host tag check; applied to the trigger element.

The tooltip surface uses a low `elevation()` box-shadow (no outline, kept compact and border-free — the arrow is unbordered too).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `ValueOrState<boolean>` | `false` | Controlled open state (boolean, `State`, or `Computed`/`ReadableState`). When read-only, pass `onDismiss` so leave/blur/Escape can close. |
| `onDismiss` | `() => void` | — | Called when the tooltip requests close. Required to close when `open` is read-only. |
| `placement` | `ValueOrState<Placement>` | `"top"` | Floating placement relative to the trigger element. |
| `content` | `ValueOrState<string>` | `"Tooltip Content"` | Text content rendered inside the tooltip. |
| `openDelay` | `number` | `100` | Hover/focus-intent delay before showing, in ms (Radix `delayDuration` parity). |
| `closeDelay` | `number` | `100` | Delay before hiding after leave/blur, in ms. |

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



