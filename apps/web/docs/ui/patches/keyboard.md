<script setup lang="ts">

import Keyboard from "../../demos/patches/Keyboard.ts?raw"

</script>

# Keyboard

Renders keyboard-key styling (themed background, border and padding). Apply to a `<kbd>`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Color tone for text/background/border. |

<CodeEditor :code="Keyboard" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/keyboard.ts [keyboard]
:::



