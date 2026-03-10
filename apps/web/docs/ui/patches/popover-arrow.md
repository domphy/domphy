<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import PopoverArrow from "../../demos/patches/PopoverArrow.ts?raw"

</script>

# Popover Arrow

Use the popoverArrow patch to customize this component.

<CodeEditor :code="PopoverArrow" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

## Appearance

| Name | tone | size | NLines | Wrapping Level | Height | Padding Block | Padding Inline | Radius |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| popoverArrow | inherit | n/a | 0 | 0 | 0 | 0 | 0 | 0 |

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/popoverArrow.ts [popoverArrow]
:::



