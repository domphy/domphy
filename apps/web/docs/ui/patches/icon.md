<script setup lang="ts">

import Icon from "../../demos/patches/Icon.ts?raw"

</script>

# Icon

Styles an inline icon container: square box that centers its content with themed color. Apply to a `<span>`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the icon. |

<CodeEditor :code="Icon" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/icon.ts [icon]
:::



