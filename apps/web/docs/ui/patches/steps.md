<script setup lang="ts">

import Steps from "../../demos/patches/Steps.ts?raw"

</script>

# Steps

All-in-one step-progress indicator. Apply `steps({ items, current })` to an `<ol>` or `<ul>` element — it generates `<li>` step elements from the `items` array, each with a numbered marker, a `data-status` attribute (`"pending"` | `"active"` | `"done"`), and `aria-current="step"` on the active one.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `StepItem[]` | `[]` | Step definitions `{ label, key? }`. `label` is a plain string (auto-wrapped) or any `DomphyElement`; `key` defaults to the item's zero-based index. |
| `current` | `ValueOrState<number>` | `0` | Zero-based index of the active step. Reactive — pass a `State` to drive the indicator. |
| `direction` | `"horizontal" \| "vertical"` | `"horizontal"` | Layout direction. |
| `color` | `ThemeColor` | `"neutral"` | Color tone for pending steps and the connector track. |
| `accentColor` | `ThemeColor` | `"primary"` | Color tone for the active and completed steps. |

<CodeEditor :code="Steps" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/steps.ts [steps]
:::



