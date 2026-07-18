<script setup lang="ts">

import ButtonGhost from "../../demos/patches/ButtonGhost.ts?raw"

</script>

# Button Ghost

A transparent button with no border or background — suitable for icon actions, inline controls, and delete/close triggers.

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
