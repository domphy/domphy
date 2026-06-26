<script setup lang="ts">

import Figure from "../../demos/patches/Figure.ts?raw"

</script>

# Figure

Use `figure` on a `figure` element. It arranges media (`img`, `svg`, `video`, `canvas`) and a `figcaption` in a column layout. Media elements are made block-level with `max-width: 100%` and a border radius. The caption uses a smaller font size. The `color` prop controls the figure and caption text tone.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the figure and caption text. |

<CodeEditor :code="Figure" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/figure.ts [figure]
:::



