<script setup lang="ts">

import Image from "../../demos/patches/Image.ts?raw"

</script>

# Image

Styles a responsive image: full-width, cover-fit, rounded corners with a themed placeholder background. Apply to an `<img>`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Placeholder background color tone. |

<CodeEditor :code="Image" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/image.ts [image]
:::



