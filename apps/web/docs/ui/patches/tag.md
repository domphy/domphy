<script setup lang="ts">

import Tag from "../../demos/patches/Tag.ts?raw"

</script>

# Tag

Apply the tag patch to a `<span>` to style it as a pill-shaped inline chip with a colored border and background. Set `color` to choose the theme tone and `removable: true` to insert an ×&nbsp;button that removes the chip from the DOM on click or Enter/Space.

The chip is `width: fit-content` so it hugs its label — `display: inline-flex` alone is blockified by a flex or grid parent, which stretched the pill across the whole column inside a `stack()`. shadcn/ui's badge carries the same `w-fit` for this reason.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the chip background, border, and text. |
| `removable` | `boolean` | `false` | When true, renders a remove (×) button that removes the tag from the DOM on click or Enter/Space. |

<CodeEditor :code="Tag" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tag.ts [tag]
:::



