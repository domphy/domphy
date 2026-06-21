<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Combobox from "../../demos/patches/Combobox.ts?raw"

</script>

# Combobox

Use `combobox` on a `div` element. It displays selected values as removable tags and an input field. The dropdown `content` is supplied by the caller — typically built with `selectList` and `selectItem`, which provide their own context-based state flow (context is a feature of those patches, not of `combobox` itself).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `DomphyElement` | — | **Required.** The floating popover element (e.g. a `selectList`). |
| `value` | `ValueOrState<string \| number \| Array<string \| number \| null \| undefined> \| null \| undefined>` | — | Selected value(s). |
| `options` | `Array<{ label: string; value: string }>` | `[]` | Available options used to render selected-value tags. |
| `multiple` | `boolean` | `false` | When true, the popover stays open after each selection. |
| `open` | `ValueOrState<boolean>` | `false` | Controls whether the popover is open. |
| `placement` | `ValueOrState<Placement>` | `"bottom"` | Floating popover placement relative to the host. |
| `color` | `ThemeColor` | `"neutral"` | Color tone for the control surface and input. |
| `input` | `DomphyElement` | — | Custom input element; when omitted a default `<input>` is created. |

<CodeEditor :code="Combobox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/combobox.ts [combobox]
:::



