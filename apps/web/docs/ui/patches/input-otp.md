<script setup lang="ts">

import InputOTP from "../../demos/patches/InputOTP.ts?raw"

</script>

# Input OTP

Lays out a one-time-password container as a horizontal row of inputs and wires keyboard navigation: auto-advance on input, Backspace/arrow movement, and paste distribution across child inputs. Apply to a container element (e.g. `<div>`) whose direct children are the OTP `<input>` boxes. Takes no props.

Arrow keys call `preventDefault()` so the caret does not also move inside the box being left, and both the `input` and `keydown` handlers bail out while an IME composition is in progress (`isComposing`) — otherwise a Japanese/Chinese/Korean composition was torn apart mid-word by the auto-advance.

Use an `inputText()` patch on each child `<input>` for individual box styling.

<CodeEditor :code="InputOTP" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputOTP.ts [inputOTP]
:::



