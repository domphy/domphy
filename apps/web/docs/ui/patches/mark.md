<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Mark from "../../demos/patches/Mark.ts?raw"

</script>

# Mark

Apply the `mark` patch to a `<mark>` element to get a tinted highlight background, rounded corners, and inline-flex layout. Must be used on a `<mark>` element. The patch sets `dataTone: "shift-2"` on the element.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `accentColor` | `ThemeColor` | `"highlight"` | Accent color tone for the highlight fill and text. |

<CodeEditor :code="Mark" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/mark.ts [mark]
:::



