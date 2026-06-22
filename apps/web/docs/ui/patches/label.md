<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Label from "../../demos/patches/Label.ts?raw"

</script>

# Label

Apply the `label` patch to a `<label>` element to get themed text color, inline-flex layout with gap, focus-within highlighting, and a disabled state. Must be used on a `<label>` element.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Base color tone for the label text. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Accent color tone applied on focus-within. |

<CodeEditor :code="Label" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/label.ts [label]
:::



