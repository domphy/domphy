<script setup lang="ts">

import InputText from "../../demos/patches/InputText.ts?raw"

</script>

# Input Text

Use `inputText` on a native `input` element. It sets `type` (default `"text"`) and applies themed border, focus ring, placeholder, disabled, and validation (`data-status`) states. Use standard HTML attributes (`placeholder`, `value`, `disabled`) directly on the element. A `type` declared on the host still wins over the patch default.

```ts
{ input: null, placeholder: "Email", $: [inputText({ type: "email" })] }
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `type` | `string` | `"text"` | The input's `type` attribute (e.g. `"email"`, `"url"`, `"tel"`). |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Text/border color tone. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Hover/focus ring color tone. |

<CodeEditor :code="InputText" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputText.ts [inputText]
:::



