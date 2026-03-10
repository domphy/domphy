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

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tabs | inherit | inherit | n>=1 | 2 | 6n+4 | 2 | 4 | 3 |
| tab | inherit | inherit | 1 | 1 | 8 | 1 | 4 | 0 |
| tabPanel | inherit | inherit | n>=1 | 2 | 6n+4 | 2 | 2 | 0 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tabs.ts [tabs]
<<< ../../../../../packages/ui/src/patches/tab.ts [tab]
<<< ../../../../../packages/ui/src/patches/tabPanel.ts [tabPanel]
:::


