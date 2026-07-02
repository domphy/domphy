<script setup lang="ts">

import Tabs from "../../demos/patches/Tabs.ts?raw"

</script>

# Tabs

All-in-one tabs patch. Apply `tabs({ items })` to any wrapper element (`div`, `section`, …) — it generates a `role="tablist"` button row and one `role="tabpanel"` panel per item from the `items` array. Tab buttons support keyboard navigation (ArrowLeft&nbsp;/ ArrowRight&nbsp;/ Home&nbsp;/ End). To control the active tab programmatically, pass an external `State` as `activeKey` and call `.set()` on it from outside.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `TabItem[]` | `[]` | Tab definitions `{ label, content, key? }`. `label` is a plain string (auto-wrapped) or any `DomphyElement`; `content` is the panel element rendered when the tab is active; `key` defaults to the item's zero-based index. |
| `activeKey` | `ValueOrState<string \| number>` | first item's key | Initially active key. Accepts a plain value or a reactive `State`. |
| `accentColor` | `ThemeColor` | `"primary"` | Theme color for the active underline indicator. |
| `color` | `ThemeColor` | `"neutral"` | Theme color for the resting underline. |

<CodeEditor :code="Tabs" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/tabs.ts [tabs]
:::



