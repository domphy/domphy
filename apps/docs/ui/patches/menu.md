<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Menu from "../../demos/patches/Menu.ts?raw"

</script>

# Menu

Use the menu patch to customize this component.

<CodeEditor :code="Menu" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| menu | inherit | inherit | c>=1 | 2 | 8n + 2 | 2 | 2 | 2 |
| menuItem | inherit | inherit | 1 | 1 | 8 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../packages/ui/src/patches/menu.ts [menu]
<<< ../../../../packages/ui/src/patches/menuItem.ts [menuItem]
:::
