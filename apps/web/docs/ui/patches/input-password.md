<script setup lang="ts">

import InputPassword from "../../demos/patches/InputPassword.ts?raw"

</script>

# Input Password

A password field wrapper: applies to a `<div>` and inserts a native `<input type="password">` plus a show/hide toggle button. The outer div carries the focus-ring via `:focus-within`, so it behaves visually like a single input.

The toggle switches `input.type` between `"password"` and `"text"` and updates its `aria-label` accordingly.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Border/background/text color tone. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Outline color on focus-within. |

## Example

```ts
import { inputPassword } from "@domphy/ui";

const Field = {
  div: null,
  $: [inputPassword()],
};
```

<CodeEditor :code="InputPassword" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputPassword.ts [inputPassword]
:::


