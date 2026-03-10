<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Menubar from "../../demos/recipes/Menubar.ts?raw"
</script>

# Menubar

A horizontal menu bar with hover-triggered dropdowns — composed from `button`, `popover`, `menu`, and `menuItem`. No new patch needed.

<CodeEditor :code="Menubar" />

## How it works

Each top-level item is a `button` with a `popover({ openOn: "hover" })` patch. The popover `content` is a `menu` with `menuItem` children. The nav container uses `display: flex` to lay items out horizontally.

| Pattern | Usage |
| --- | --- |
| `popover({ openOn: "hover" })` | Opens dropdown on hover |
| `menu` + `menuItem` | Styled dropdown list |
| `display: flex` on container | Horizontal layout |

