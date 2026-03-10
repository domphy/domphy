<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import HoverCard from "../../demos/recipes/HoverCard.ts?raw"
</script>

# Hover Card

A rich content card that appears on hover — composed from `popover` and `card`. No new patch needed.

<CodeEditor :code="HoverCard" />

## How it works

`popover({ openOn: "hover" })` already handles hover show/hide and floating positioning. The `content` prop receives any `DomphyElement` — here a `card` with profile info. The trigger is a `link` element.

| Pattern | Usage |
| --- | --- |
| `popover({ openOn: "hover" })` | Hover trigger + floating position |
| `card` | Styled content container |

