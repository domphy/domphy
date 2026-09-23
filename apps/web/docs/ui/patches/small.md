<script setup lang="ts">

import Small from "../../demos/patches/Small.ts?raw"

</script>

# Small

Styles small/secondary text: one step smaller font size (`data-size="decrease-1"`) with a themed foreground color.

## Contrast

The tone is `shift-10`, one step above the `"text"` floor, because this text renders below the WCAG large-text threshold and so must always clear 4.5:1. Measured in Chromium on the built bundle: **6.01–7.73:1 in light and 6.33–7.73:1 in dark** on every edge-anchored surface (`shift-0`–`shift-3`, `shift-14`–`shift-17`).

Three things forfeit that guarantee, and all three belong to the call site:

- **A host-declared `style.color`** wins over the patch (native beats patch). `"text"` / `shift-9` on a `shift-1` surface measures **4.23:1** — an axe `color-contrast` failure at this size. Pass `color` for a different family instead of restyling.
- **An ancestor's scoped `& small` rule** wins too, even when the call site did everything right. A descendant selector is specificity `(0,1,1)`; this patch's own generated class is `(0,1,0)`, so it loses the cascade:

  ```ts
  // inside a correctly tone-anchored card — dataTone: "shift-1", background "inherit"
  "& small": {
    display: "block",
    color: (l) => themeColor(l, "shift-8"), // ← silently outranks small()
  },
  ```

  Measured with no inline style on the `<small>` at all: that `shift-8` emits `var(--neutral-9)` = `#707070` on the card's `#ededed` = **4.23:1**. Delete the `color` line and the same element measures **6.27:1** (light) / **7.21:1** (dark). Scope layout in such a rule and leave the colour to the patch.

  The specificity is deliberately **not** escalated to win this: a patch that outranked descendant rules would leave an author no way to restyle short of `!important`.
- **A surface tinted without a tone context** — `backgroundColor: (l) => themeColor(l, "shift-2")` instead of `dataTone: "shift-2"` + `themeColor(l, "inherit")`. Every child then still resolves against the page root, and even `shift-10` drops to **4.34:1** on a `shift-2` tint and **3.67:1** on `shift-3` (light). `@domphy/doctor`'s `tone-background-inherit` rule flags exactly this.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the text. |

<CodeEditor :code="Small" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/small.ts [small]
:::



