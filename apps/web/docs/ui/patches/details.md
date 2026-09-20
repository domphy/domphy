<script setup lang="ts">

import Details from "../../demos/patches/Details.ts?raw"

</script>

# Details

Native `<details>` disclosure: themed `summary` with a rotating chevron, expand/collapse on the body.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the body and summary. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Summary focus-ring tone. |
| `duration` | `number` | `240` | Open/close transition duration in milliseconds. |

<CodeEditor :code="Details" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/details.ts [details]
:::



