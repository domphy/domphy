<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Table from "../../demos/patches/Table.ts?raw"

</script>

# Table


Use the table patch to customize this component.

<CodeEditor :code="Table" />

## Code snippets


Zebra row
```typescript
"& tbody tr:nth-child(even)": {
  backgroundColor: (listener) => themeColor(listener, "shift-1", color),
}
```
## Patch Sources
::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| table | inherit | inherit | n>=1 | 1 | 6n+2 | 1 | 3 | 2 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/table.ts [table]
:::


