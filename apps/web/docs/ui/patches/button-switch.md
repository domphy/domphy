<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import ButtonSwitch from "../../demos/patches/ButtonSwitch.ts?raw"

</script>

# Button Switch

A pill-shaped toggle switch with `role="switch"`. Clicking flips the bound `checked` state and slides the thumb. Apply to a `<button>` element whose first child is a `<span>` (used as the thumb).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | `boolean` (or `State`) | `false` | Toggle state — `true` = on. |
| `color` | `ThemeColor` (or `State`) | `"neutral"` | Theme color tone for the unchecked (off) track. |
| `accentColor` | `ThemeColor` (or `State`) | `"primary"` | Theme color tone for the checked (on) track. |

<CodeEditor :code="ButtonSwitch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/buttonSwitch.ts [buttonSwitch]
:::



