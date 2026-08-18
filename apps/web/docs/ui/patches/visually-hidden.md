# Visually Hidden

Visually hides an element while keeping it in the accessibility tree — the classic "sr-only" recipe for screen-reader-only labels, live-region text, and skip links (before focus). Styles the host only; apply to any element. `visuallyHidden()` takes no props.

```ts
import { visuallyHidden } from "@domphy/ui"

{ span: "Opens in a new tab", $: [visuallyHidden()] }
```

Use it when the visible UI already conveys the meaning (an icon-only button, decorative letter-split text) but assistive technology still needs the words.

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/visuallyHidden.ts [visuallyHidden]
:::
