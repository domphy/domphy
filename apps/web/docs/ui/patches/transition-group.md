<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import TransitionGroup from "../../demos/patches/TransitionGroup.ts?raw"

</script>

# Transition Group

Use `transitionGroup` on any list container. It animates child reordering using the FLIP technique: it records each child's position before an update and smoothly transitions it from its old position to its new one. Children are tracked by `_key` when set, falling back to index position. The `duration` and `delay` props control the CSS transition timing.

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



