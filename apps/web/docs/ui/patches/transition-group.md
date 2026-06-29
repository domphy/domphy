<script setup lang="ts">

import TransitionGroup from "../../demos/patches/TransitionGroup.ts?raw"

</script>

# Transition Group

Use `transitionGroup` on any list container. It animates child reordering using the FLIP technique: it records each child's position before an update and smoothly transitions it from its old position to its new one. Children are tracked by `_key` when set, falling back to index position.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `duration` | `number` | `300` | CSS transition duration in milliseconds. |
| `delay` | `number` | `0` | CSS transition delay in milliseconds. |

<CodeEditor :code="TransitionGroup" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/transitionGroup.ts [transitionGroup]
:::



