<script setup lang="ts">

import Table from "../../demos/patches/Table.ts?raw"

</script>

# Table

Styles a data table (header/body/footer cells, caption, row hover, borders) on the host `<table>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color applied across cells and text. |

<CodeEditor :code="Table" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/table.ts [table]
:::



