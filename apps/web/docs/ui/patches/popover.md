<script setup lang="ts">

import Popover from "../../demos/patches/Popover.ts?raw"

</script>

# Popover

Apply the `popover` patch to any trigger element (typically a `button`). It attaches a floating content panel anchored to the trigger, positioned via `@domphy/floating`. The content is rendered into a fixed overlay layer and dismissed when the trigger loses focus (blur).

The patch wires accessibility automatically: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and focus/blur dismissal.

When `openOn` is `"hover"`, the popover also opens on focus and closes on blur. When `openOn` is `"click"`, focus has no effect.

The panel surface carries a `"border-strong"` outline plus a medium `elevation()` box-shadow, so it reads as a raised layer above the page.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `openOn` | `"click" \| "hover"` | `"click"` | Interaction that opens the popover. Optional — defaults to `"click"` when omitted. |
| `content` | `DomphyElement` | — | The floating content element to display. Required. |
| `open` | `ValueOrState<boolean>` | `false` | Controlled open state. |
| `placement` | `ValueOrState<Placement>` | `"bottom"` | Floating placement (e.g. `"top-start"`, `"right"`). |

## Example

```ts
import { button, popover } from "@domphy/ui";

const content = {
  div: "Popover content",
};

const App = {
  button: "Open popover",
  $: [button(), popover({ openOn: "click", content })],
};
```

<CodeEditor :code="Popover" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/popover.ts [popover]
:::



