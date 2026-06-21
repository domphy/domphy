<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Tabs from "../../demos/patches/Tabs.ts?raw"

</script>

# Tab

Styles a single tab trigger inside a `tabs` tablist on the host `<button>` element.
Wires up the tab's id/aria-controls/aria-selected, click selection, and
arrow/Home/End keyboard navigation via the surrounding `tabs` context.
Must be used inside a `tabs` patch.

<CodeEditor :code="Tabs" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tab.ts [tab]
<<< ../../../../../packages/ui/src/patches/tabs.ts [tabs]
<<< ../../../../../packages/ui/src/patches/tabPanel.ts [tabPanel]
:::



