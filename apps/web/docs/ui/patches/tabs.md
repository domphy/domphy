<script setup lang="ts">

import Tabs from "../../demos/patches/Tabs.ts?raw"

</script>

# Tabs

Container patch that establishes a `tabs` context (with a shared `activeKey`
state) and the `tablist` role for child `tab`/`tabPanel` patches. Typically
applied to a wrapper element. Accepts an optional `activeKey` prop (initial
active tab key, defaults to `0`).

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



