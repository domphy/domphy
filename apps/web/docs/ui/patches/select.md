<script setup lang="ts">

import Select from "../../demos/patches/Select.ts?raw"

</script>

# Select

Use the select patch to customize this element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Theme color tone for text, background, and outline. |
| `accentColor` | `ThemeColor` | `"primary"` | Theme color tone for hover and focus outlines. |

<CodeEditor :code="Select" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/select.ts [select]
:::



