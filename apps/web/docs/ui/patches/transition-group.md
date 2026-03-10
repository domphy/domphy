<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import TransitionGroup from "../../demos/patches/TransitionGroup.ts?raw"

</script>

# Transition Group

Use the transition-group patch to customize this component.

<CodeEditor :code="TransitionGroup" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| transitionGroup | n/a | n/a | 0 | 0 | 0 | 0 | 0 | 0 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/transitionGroup.ts [transitionGroup]
:::


