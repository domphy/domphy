<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Tabs from "../../demos/patches/Tabs.ts?raw"

</script>

# Tabs

Use the tabs patch to customize this component.

<CodeEditor :code="Tabs" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tabs.ts [tabs]
<<< ../../../../../packages/ui/src/patches/tab.ts [tab]
<<< ../../../../../packages/ui/src/patches/tabPanel.ts [tabPanel]
:::



