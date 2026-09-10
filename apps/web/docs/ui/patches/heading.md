<script setup lang="ts">

import Heading from "../../demos/patches/Heading.ts?raw"

</script>

# Heading

Styles a heading, scaling font size by level relative to the theme base size. Apply to `<h1>`–`<h6>`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the heading text. |
| `size` | `ElementSize` | tag-based HeadingShift (`h1` `increase-4` … `h6` `decrease-1`) | Optional. When set, `fontSize` is `themeSize(listener, size)` (`"inherit"` \| `"increase-N"` \| `"decrease-N"`, N ≤ 7) with no tag bump. When omitted, follows the host tag. |

<CodeEditor :code="Heading" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/heading.ts [heading]
:::



