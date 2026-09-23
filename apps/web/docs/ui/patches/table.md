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

## Wide tables

`table()` styles the `<table>` element and nothing around it — it never makes the table a scroll container, so a table wider than its column overflows the page. Wrap it instead, and give the wrapper a name so keyboard users can scroll it:

```ts
{
  div: [{ table: rows, $: [table()] }],
  $: [scrollArea({ label: "Quarterly revenue" })],
}
```

Put `role="region"` on that wrapper, never on the `<table>`: a role on the table replaces its implicit `table` role and strips the row/column semantics screen readers announce. See [scrollArea](./scroll-area#keyboard-scrollable-regions).

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/table.ts [table]
:::



