<script setup lang="ts">

import Steps from "../../demos/patches/Steps.ts?raw"

</script>

# Steps

Use `steps` on an `<ol>` container to create a step-progress indicator. It establishes a reactive `steps` context with a `current` index. Pair with `stepItem` patches on child `<li>` elements.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `current` | `number \| State<number>` | `0` | Zero-based index of the active step. Reactive — pass a `State` to drive the indicator. |
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
<<< ../../../../../packages/ui/src/patches/stepItem.ts [stepItem]
:::



