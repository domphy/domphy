<script setup lang="ts">

import ScrollArea from "../../demos/patches/ScrollArea.ts?raw"

</script>

# Scroll Area

Apply the `scrollArea` patch to any block element to replace the default browser scrollbar with a thin, themed overlay scrollbar. Sets `overflow: auto` and styles `::-webkit-scrollbar` pseudo-elements (Chrome/Safari/Edge) and `scrollbar-width`/`scrollbar-color` (Firefox).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the scrollbar thumb. |

## Example

```ts
import { scrollArea } from "@domphy/ui";

const List = {
  div: [...longContent],
  $: [scrollArea()],
  style: { maxHeight: "300px" },
};
```

<CodeEditor :code="ScrollArea" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/scrollArea.ts [scrollArea]
:::


