<script setup lang="ts">

import Tabs from "../../demos/patches/Tabs.ts?raw"

</script>

# Tab Panel

Use the tabPanel patch to customize this element. Apply to a `<div>` placed inside a `tabs` control alongside `tab` buttons. Wires up `role="tabpanel"`, `id`, `aria-labelledby`, and toggles `hidden` based on the active key. Must be used inside a `tabs` patch.

<CodeEditor :code="Tabs" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tabPanel.ts [tabPanel]
<<< ../../../../../packages/ui/src/patches/tab.ts [tab]
<<< ../../../../../packages/ui/src/patches/tabs.ts [tabs]
:::


