<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Menu from "../../demos/patches/Menu.ts?raw"

</script>

# Menu Item

Use the menuItem patch to customize this element. Apply to a `<button>` placed inside a `menu`.

<CodeEditor :code="Menu" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/menuItem.ts [menuItem]
<<< ../../../../../packages/ui/src/patches/menu.ts [menu]
:::



