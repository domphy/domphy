<script setup lang="ts">

import DescriptionList from "../../demos/patches/DescriptionList.ts?raw"

</script>

# Description List

Use the description-list patch to customize this element.

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



