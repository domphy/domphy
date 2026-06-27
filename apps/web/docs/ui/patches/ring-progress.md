<script setup lang="ts">

import RingProgress from "../../demos/patches/RingProgress.ts?raw"

</script>

# Ring Progress

A circular progress indicator rendered via CSS `conic-gradient` masked into a donut shape. Progress advances clockwise from 12 o'clock. Sets `role="progressbar"` with `aria-valuenow/min/max`. Apply to a `<div>`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ValueOrState<number>` | `0` | Progress percentage 0–100. |
| `color` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color for the filled arc. |
| `trackColor` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color for the background track. |
| `size` | `number` | `16` | Diameter in `themeSpacing` units (e.g. `16` → `4em`). |
| `thickness` | `number` | `0.25` | Ring stroke as a fraction of the radius. 0 = no ring, 0.5 = solid disc. |

## Example

```ts
import { toState } from "@domphy/core";
import { ringProgress } from "@domphy/ui";

const progress = toState(72);

const App = {
  div: null,
  $: [ringProgress({ value: progress, color: "success", size: 20 })],
};
```

<CodeEditor :code="RingProgress" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/ringProgress.ts [ringProgress]
:::


