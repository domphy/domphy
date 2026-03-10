<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import ContextMenu from "../../demos/recipes/ContextMenu.ts?raw"
</script>

# Context Menu

A context menu is not a patch — it is a composition of existing patches and Domphy patterns. No new behavior is introduced; the recipe shows how to combine `menu`, `menuItem`, and state to produce a right-click menu positioned at the cursor.

<CodeEditor :code="ContextMenu" />

## How it works

**State:**
- `open` — controls visibility
- `x`, `y` — cursor position captured from the `contextmenu` event

**Menu element** is declared in the tree alongside the trigger area. `position: fixed` with reactive `left`/`top` places it at the cursor. `display: none` when closed keeps it out of pointer events.

**Close on outside click** is registered imperatively in `_onMount` via `document.addEventListener("click", ...)` and cleaned up with `addHook("Remove", ...)`.

**Trigger** uses `onContextMenu` to capture cursor position, then sets `open` to `true`.

## Key patterns used

| Pattern | Usage |
| --- | --- |
| Declare in tree + hide | `open` state controls `display` and `pointerEvents` |
| Reactive style | `left`/`top` update without re-render |
| `_onMount` + `addHook` | Register and clean up document click listener |
| `menu` + `menuItem` | Styled menu list out of the box |

