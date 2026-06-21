<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Toggle from "../../demos/patches/Toggle.ts?raw"

</script>

# Toggle

Styles a single toggle button inside a `toggleGroup` on the host `<button>` element. Wires up `aria-pressed` and click-to-toggle against the surrounding `toggleGroup` context (single- or multi-select). Must be used inside a `toggleGroup` patch.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` (or `State`) | `"neutral"` | Theme color tone for the resting/hover background and text. |
| `accentColor` | `ThemeColor` (or `State`) | `"primary"` | Theme color tone for the pressed/focus state. |

<CodeEditor :code="Toggle" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/toggleGroup.ts [toggleGroup]
<<< ../../../../../packages/ui/src/patches/toggle.ts [toggle]
:::



