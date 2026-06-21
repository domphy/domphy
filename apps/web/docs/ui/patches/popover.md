<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Popover from "../../demos/patches/Popover.ts?raw"

</script>

# Popover

Apply the `popover` patch to any trigger element (typically a `button`). It attaches a floating content panel anchored to the trigger, positioned via `@domphy/floating`. The content is rendered into a fixed overlay layer and dismissed on outside click, Escape, or blur.

The patch wires accessibility automatically: `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, and focus/blur dismissal.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `openOn` | `"click" \| "hover"` | — | Interaction that opens the popover. Required. |
| `content` | `DomphyElement` | — | The floating content element to display. Required. |
| `open` | `ValueOrState<boolean>` | `false` | Controlled open state. |
| `placement` | `ValueOrState<Placement>` | `"bottom"` | Floating placement (e.g. `"top-start"`, `"right"`). |

## Example

```ts
import { toState } from "@domphy/core";
import { button, popover } from "@domphy/ui";

const open = toState(false);

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



