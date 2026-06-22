<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Steps from "../../demos/patches/Steps.ts?raw"

</script>

# Step Item

Use `stepItem` on a `<li>` placed inside a `steps` container. It reads the parent `steps` context to set `data-status` (`"pending"` | `"active"` | `"done"`) and `aria-current="step"` on the host element. The element's text content becomes the step label.

`stepItem` takes no props. Active-step coloring uses the `accentColor` from the parent `steps` context (default `"primary"`); done and pending steps use the `color` from the parent context (default `"neutral"`). Pass `color` and `accentColor` to the `steps` patch to control the palette.

<CodeEditor :code="Steps" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/stepItem.ts [stepItem]
<<< ../../../../../packages/ui/src/patches/steps.ts [steps]
:::



