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
| `value` | `ValueOrState<string>` | — | Forwarded onto the inner `<input>` (host `value` is also lifted). |
| `name` | `string` | — | Forwarded onto the inner `<input>` so FormData includes the field (host `name` is also lifted). |
| `onInput` | `(event: Event) => void` | — | Forwarded onto the inner `<input>` (host `onInput` is also lifted). |
| `disabled` | `ValueOrState<boolean>` | — | Forwarded onto the inner `<input>` (host `disabled` is also lifted). |
| `required` | `boolean` | — | Forwarded onto the inner `<input>` (host `required` is also lifted). |
| `autocomplete` | `string` | `"current-password"` | Native `autocomplete` token on the inner input. |
| `ariaLabel` | `string` | `"Password"` | Accessible name for the inner input. |

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


