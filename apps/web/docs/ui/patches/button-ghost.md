<script setup lang="ts">

import ButtonGhost from "../../demos/patches/ButtonGhost.ts?raw"

</script>

# Button Ghost

A transparent button with no border or background — suitable for icon actions, inline controls, and delete/close triggers.

The control is `width: fit-content`, matching `button()` — `display: inline-flex` alone is blockified by a flex or grid parent, so inside a `stack()` the ghost button stretched to the full column while the outline button next to it did not, although `button({ variant: "ghost" })` documents the two as visually identical.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Text color tone. |
| `size` | `"small" \| "medium" \| "large"` | `"medium"` | Button size preset — scales padding and font size via the density/size tokens. Also reachable via `button({ variant: "ghost", size })`. |

<CodeEditor :code="ButtonGhost" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/buttonGhost.ts [buttonGhost]
:::
