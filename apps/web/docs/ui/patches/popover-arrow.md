<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import PopoverArrow from "../../demos/patches/PopoverArrow.ts?raw"

</script>

# Popover Arrow

Apply the popoverArrow patch to a floating popover container to add a small rotated arrow (rendered via `::after`) that points toward the anchor element. Pass `placement` matching the popover's floating placement — the arrow is automatically drawn on the opposite side. Use `color` to match the popover surface and `bordered` to control whether the arrow has a 1&nbsp;px border.

<CodeEditor :code="PopoverArrow" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/popoverArrow.ts [popoverArrow]
:::




