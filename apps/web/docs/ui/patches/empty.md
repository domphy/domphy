<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Empty from "../../demos/patches/Empty.ts?raw"

</script>

# Empty

Use `empty` on a container to display an empty-state placeholder. It centers children in a flex column with muted coloring and comfortable padding. The first child (icon) is rendered slightly more muted than the remaining children (title and description).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ThemeColor` | `"neutral"` | Color tone for the muted text and icon. |

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



