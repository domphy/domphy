<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Heading from "../../demos/patches/Heading.ts?raw"

</script>

# Heading

Styles a heading, scaling font size by level relative to the theme base size. Apply to `<h1>`–`<h6>`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the heading text. |

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



