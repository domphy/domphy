<script setup lang="ts">

import Tabs from "../../demos/patches/Tabs.ts?raw"

</script>

# Tab

Use `tab` on a `<button>` inside a `tabs` tablist. It wires the tab's `id`, `aria-controls`, `aria-selected`, click selection, and ArrowLeft/ArrowRight/Home/End keyboard navigation via the surrounding `tabs` context. Must be used inside a `tabs` patch.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ThemeColor` | `"neutral"` | Resting and hover underline tone. |
| `accentColor` | `ThemeColor` | `"primary"` | Active and focus underline tone. |

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



