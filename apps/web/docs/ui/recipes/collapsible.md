<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Collapsible from "../../demos/recipes/Collapsible.ts?raw"
</script>

# Collapsible

A programmatically controlled expand/collapse section — composed from `details` and `button`. No new patch needed.

<CodeEditor :code="Collapsible" />

## How it works

The HTML `<details>` element handles open/close natively. The `details` patch adds animation and styling. To control it programmatically (without clicking the summary), bind the `open` attribute reactively to a `toState` value. Clicking any external button toggles the state.

| Pattern | Usage |
| --- | --- |
| `details` patch | Animated expand/collapse with styling |
| Reactive attribute | `open: (listener) => state.get(listener)` |
| External trigger | Any button can toggle `open` state |

