<script setup lang="ts">

import Skeleton from "../../demos/patches/Skeleton.ts?raw"

</script>

# Skeleton

Use the skeleton patch on any block element to show a loading placeholder. A left-to-right shimmer gradient sweeps over the themed base surface.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the placeholder background. |

<CodeEditor :code="Skeleton" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/skeleton.ts [skeleton]
:::



