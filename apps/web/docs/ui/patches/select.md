<script setup lang="ts">

import Select from "../../demos/patches/Select.ts?raw"

</script>

# Select

Styles a native `<select>` control: removes the default appearance, applies themed colors, outline, density-scaled padding/radius, a custom chevron background icon, and hover/focus/disabled/optgroup/option states.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Theme color tone for text, background, and outline. |
| `accentColor` | `ThemeColor` | `"primary"` | Theme color tone for hover and focus outlines. |

<CodeEditor :code="Select" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/select.ts [select]
:::



