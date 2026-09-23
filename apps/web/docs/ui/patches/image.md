<script setup lang="ts">

import Image from "../../demos/patches/Image.ts?raw"

</script>

# Image

Styles a responsive image: full-width, cover-fit, rounded corners with a themed placeholder background. Apply to an `<img>`.

`alt` is required (WCAG 1.1.1) and forwarded as the host's native `alt` attribute — pass `decorative: true` instead for a purely decorative image (`alt=""`).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `alt` | `string` | — (required unless `decorative`) | Accessible text alternative. |
| `decorative` | `boolean` | `false` | Marks the image as pure decoration — renders `alt=""`. |
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



