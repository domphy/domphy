<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import FormGroup from "../../demos/patches/FormGroup.ts?raw"

</script>

# Form Group

Use `formGroup` on a `fieldset` element. It defines a grid layout contract for its children: `legend` spans the full width, `label` elements occupy the first column, controls (any non-`legend`/`label`/`p` child) occupy the second column, and help text `p` elements appear below their control. Set `layout` to `"vertical"` to stack labels above controls instead of placing them side by side (default `"horizontal"`). The `color` prop controls the legend, text, and surface tone.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Color tone for the legend, text, and surface. |
| `layout` | `"horizontal" \| "vertical"` | `"horizontal"` | Whether labels are placed side by side (`horizontal`) or stacked above controls (`vertical`). |

<CodeEditor :code="FormGroup" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/formGroup.ts [formGroup]
:::



