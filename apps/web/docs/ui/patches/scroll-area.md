<script setup lang="ts">

import ScrollArea from "../../demos/patches/ScrollArea.ts?raw"

</script>

# Scroll Area

Apply the `scrollArea` patch to any block element to replace the default browser scrollbar with a thin, themed overlay scrollbar. Sets `overflow: auto` and styles `::-webkit-scrollbar` pseudo-elements (Chrome/Safari/Edge) and `scrollbar-width`/`scrollbar-color` (Firefox).

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the scrollbar thumb. |
| `label` | `string` | — | Accessible name for the scroll region. Setting it makes the host a tabbable `role="region"`. |

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

## Keyboard-scrollable regions

A region that scrolls but contains nothing focusable can only be scrolled with a pointer — a WCAG 2.1.1 failure, reported by axe as `scrollable-region-focusable`. A wide table, a code block or a diagram is exactly that case. Pass `label` and the host becomes a named, tabbable region (`role="region"` + `aria-label` + `tabindex="0"`), the wrapper pattern GOV.UK and shadcn use around overflowing tables:

```ts
import { scrollArea, table } from "@domphy/ui";

const Wide = {
  div: [{ table: rows, $: [table()] }],
  $: [scrollArea({ label: "Quarterly revenue" })],
};
```

The wrapper is what carries `role="region"`, never the `<table>` itself: a role on the table would override its implicit `table` role and strip the row/column semantics screen readers rely on.

Leave `label` off when the content already holds focusable elements — a nav list, a menu, a form. Those are reachable with Tab already, and a region tab stop in front of them is one extra keystroke per list.

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/scrollArea.ts [scrollArea]
:::


