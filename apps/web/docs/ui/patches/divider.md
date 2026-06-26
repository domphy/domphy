<script setup lang="ts">

import Divider from "../../demos/patches/Divider.ts?raw"

</script>

# Divider

Use `divider` on a `div` element. It renders a horizontal separator (`role="separator"`) with a labelled line on each side of the element's text content — suitable for "or" dividers. The `color` prop controls the text and rule color tone.

<CodeEditor :code="Divider" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/divider.ts [divider]
:::



