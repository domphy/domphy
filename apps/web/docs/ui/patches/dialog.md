<script setup lang="ts">

import Dialog from "../../demos/patches/Dialog.ts?raw"

</script>

# Dialog

Apply the `dialog` patch to a `<dialog>` element. It drives open/close via the native `showModal()`/`close()` API, fades with a 200 ms opacity transition, and closes when the user clicks the backdrop or presses Escape (via the animated state path, not an abrupt browser close).

The patch handles accessibility automatically: it sets `aria-modal="true"`, traps Tab focus within the dialog while open (cycling between first and last focusable elements), restores focus to the previously focused element when closed, and locks page scroll while open.

The dialog surface uses a high `elevation()` box-shadow (no outline — shadow-only, the modern modal look) and a density-scaled border-radius.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `ValueOrState<boolean>` | `false` | Controls visibility. Set to `true` to open, `false` to close. |
| `color` | `ThemeColor` | `"neutral"` | Theme color tone for the dialog surface. |

## Example

```ts
import { toState } from "@domphy/core";
import { button, dialog } from "@domphy/ui";

const open = toState(false);

const App = {
  div: [
    {
      button: "Open",
      $: [button()],
      onClick: () => open.set(true),
    },
    {
      dialog: [
        { h3: "Confirm action" },
        { p: "Are you sure you want to continue?" },
        {
          button: "Close",
          $: [button({ color: "primary" })],
          onClick: () => open.set(false),
        },
      ],
      $: [dialog({ open })],
    },
  ],
};
```

<CodeEditor :code="Dialog" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/dialog.ts [dialog]
:::



