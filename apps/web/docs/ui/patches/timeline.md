<script setup lang="ts">

import Timeline from "../../demos/patches/Timeline.ts?raw"

</script>

# Timeline

Two composable patches for vertical event timelines. Apply `timeline` to the `<ol>` or `<ul>` container. Apply `timelineItem` to each `<li>` — it creates a 2-column grid with a colored dot (`::before`) and a vertical connector line (`::after`). Set `active` to highlight the dot, and `last` to suppress the connector on the final item.

## timeline

No props. Resets list styles and arranges children in a column.

## timelineItem

| Prop | Type | Default |
|------|------|---------|
| `active` | `ValueOrState<boolean>` | `false` |
| `last` | `boolean` | `false` |
| `color` | `ThemeColor` | `"neutral"` |
| `accentColor` | `ThemeColor` | `"primary"` |

<CodeEditor :code="Timeline" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/timeline.ts [timeline / timelineItem]
:::
