<script setup lang="ts">

import Button from "../../demos/patches/Button.ts?raw"

</script>

# Button

Use the button patch to customize this element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"primary"` | Button color tone. |

<CodeEditor :code="Button" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/button.ts [button]
:::



