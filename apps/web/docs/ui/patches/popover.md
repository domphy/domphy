<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Popover from "../../demos/patches/Popover.ts?raw"

</script>

# Popover

Apply the `popover` patch to any trigger element (typically a `button`). It attaches a floating content panel anchored to the trigger, positioned via `@domphy/floating`. The content is rendered into a fixed overlay layer and dismissed when the trigger loses focus (blur).

The patch wires accessibility automatically: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and focus/blur dismissal.

The popover also opens whenever the trigger receives focus, regardless of the `openOn` value. Focus-open is unconditional and is not gated by `openOn`.

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



