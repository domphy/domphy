<script setup lang="ts">

import Code from "../../demos/patches/Code.ts?raw"

</script>

# Code

Styles an inline code snippet in the theme's monospace stack, with a subtle surface background, rounded corners, and shifted tone. Apply to a `<code>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Surface and text tone. |

<CodeEditor :code="Code" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/code.ts [code]
:::



