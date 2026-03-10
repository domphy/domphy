<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Drawer from "../../demos/patches/Drawer.ts?raw"

</script>

# Drawer

Use the drawer patch to customize this component.

<CodeEditor :code="Drawer" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| drawer | shift-1 | inherit | n>=1 | 3 | 6n+6 | 3 | 3 | 4 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/drawer.ts [drawer]
:::
