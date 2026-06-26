<script setup lang="ts">

import ToggleGroup from "../../demos/patches/ToggleGroup.ts?raw"

</script>

# Toggle Group

Use `toggleGroup` on a wrapper element to build a segmented toggle control. It establishes a `toggleGroup` context that child `toggle` buttons use to sync selection. Supports single-select and multi-select modes via the `multiple` prop.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string \| string[] \| State<...>` | `""` (single) or `[]` (multiple) | Selected key(s). Pass a `State` to control selection externally. |
| `multiple` | `boolean` | `false` | Allow multiple toggles selected at once. |
| `color` | `ThemeColor` | `"neutral"` | Background and border tone for the group. |

<CodeEditor :code="ToggleGroup" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/toggleGroup.ts [toggleGroup]
<<< ../../../../../packages/ui/src/patches/toggle.ts [toggle]
:::


