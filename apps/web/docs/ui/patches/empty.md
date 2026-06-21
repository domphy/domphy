<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Empty from "../../demos/patches/Empty.ts?raw"

</script>

# Empty

Use the empty patch on a container to display an empty-state placeholder. It centers its children in a flex column with muted coloring and comfortable padding. Provide the icon, title, and description as child elements.

<CodeEditor :code="Empty" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/empty.ts [empty]
:::



