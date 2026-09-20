<script setup lang="ts">

import UnorderedList from "../../demos/patches/UnorderedList.ts?raw"

</script>

# Unordered List

Styles a bulleted list (disc markers, reset margins, themed text) on the host `<ul>` element.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Tone for the list text. |

<CodeEditor :code="UnorderedList" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/unorderedList.ts [unorderedList]
:::



