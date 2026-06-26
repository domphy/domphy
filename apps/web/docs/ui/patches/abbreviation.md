<script setup lang="ts">

import Abbreviation from "../../demos/patches/Abbreviation.ts?raw"

</script>

# Abbreviation

Use the abbreviation patch to customize this element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the abbreviation text. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Accent color used for the abbreviation underline and tooltip styling. |

<CodeEditor :code="Abbreviation" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/abbreviation.ts [abbreviation]
:::



