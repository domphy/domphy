<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import AlertDialog from "../../demos/recipes/AlertDialog.ts?raw"
</script>

# Alert Dialog

A confirmation dialog with explicit confirm/cancel actions — composed from `dialog`, `button`, and `heading`. No new patch needed.

<CodeEditor :code="AlertDialog" />

## How it works

The `dialog` patch handles open/close state, backdrop, and scroll lock. The confirm/cancel buttons are plain `button` elements inside the dialog content. The pattern is identical to a regular dialog — the only difference is the content: a description of the destructive action and two explicit action buttons.

| Pattern | Usage |
| --- | --- |
| `dialog({ open })` | Modal with state-controlled visibility |
| `button({ color: "error" })` | Destructive action styled in error color |
| Declare in tree + hide | Dialog always in tree, `open` state controls visibility |

