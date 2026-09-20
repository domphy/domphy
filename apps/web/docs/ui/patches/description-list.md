<script setup lang="ts">

import DescriptionList from "../../demos/patches/DescriptionList.ts?raw"

</script>

# Description List

Styles a description list as a two-column grid (terms in the first column, descriptions in the second), theming the nested `<dt>`/`<dd>` elements. Apply to a `<dl>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the description list text and borders. |

<CodeEditor :code="DescriptionList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/descriptionList.ts [descriptionList]
:::



