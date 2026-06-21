<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Badge from "../../demos/patches/Badge.ts?raw"

</script>

# Badge

Apply the badge patch to any inline container (typically a `<span>` wrapping an icon or button) to render a small count bubble pinned to its top-right corner via a `::after` pseudo-element. Use `label` to set the count and `color` to control the severity tone.

<CodeEditor :code="Badge" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/badge.ts [badge]
:::




