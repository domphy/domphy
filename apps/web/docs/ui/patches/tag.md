<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Tag from "../../demos/patches/Tag.ts?raw"

</script>

# Tag

Apply the tag patch to a `<span>` to style it as a rounded inline chip with a colored border and background. Set `color` to choose the theme tone and `removable: true` to insert an ×&nbsp;button that removes the chip from the DOM on click.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the chip background, border, and text. |
| `removable` | `boolean` | `false` | When true, renders a remove (×) button that removes the tag from the DOM on click. |

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



