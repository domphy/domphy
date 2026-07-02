<script setup lang="ts">

import Menubar from "../../demos/recipes/Menubar.ts?raw"
</script>

# Menubar

A horizontal menu bar with hover-triggered dropdowns — composed from `button`, `popover`, and `menu`. No new patch needed.

<CodeEditor :code="Menubar" />

## How it works

Each top-level item is a `button` with a `popover({ openOn: "hover" })` patch. The popover `content` is a wrapper with the all-in-one `menu({ items })` patch, which generates the `role="menuitem"` buttons (with keyboard navigation) from the `items` array. The nav container uses `display: flex` to lay items out horizontally.

| Pattern | Usage |
| --- | --- |
| `popover({ openOn: "hover" })` | Opens dropdown on hover |
| `menu({ items })` | Styled dropdown list with keyboard navigation |
| `display: flex` on container | Horizontal layout |

