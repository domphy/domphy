---
title: "@domphy/editor — Bubble Menu"
description: "A formatting menu that floats above the text selection, positioned with @domphy/floating against a virtual element that tracks the live selection rectangle."
---

# Bubble Menu

<script setup lang="ts">
import BubbleMenuDemo from "../../demos/editor/bubble-menu.ts?raw"
</script>

Select a few words and a small menu appears above them. It is anchored to the selection rectangle itself — not to the editor box — so it follows the text when you scroll, resize, or extend the selection across lines.

<CodeEditor :code="BubbleMenuDemo" />

## How it works

- **The anchor is a virtual element, not a DOM node.** There is no element to point at: a text selection is a `Range`. `bubbleMenu()` hands `@domphy/floating` an object with `getBoundingClientRect()`/`getClientRects()` that re-read `getSelection().getRangeAt(0)` on every call, so `autoUpdate` recomputes against the *live* rect on scroll and resize instead of a stale snapshot from when the menu opened.
- **`inline()` runs first in the middleware chain.** A selection that wraps across two lines has a bounding box spanning both, and anchoring to its centre would park the menu in the middle of the paragraph. `inline()` picks the rect that actually matches where the selection starts. Then `offset(8)` lifts it off the text, `flip()` drops it below when there is no room above, and `shift()` keeps it inside the viewport.
- **`shouldShow` gates visibility per selection change.** The default is "editable, with a non-empty selection"; this demo also excludes code blocks, where inline marks are meaningless. It runs on every `selectionUpdate`, so it can read anything off the editor.
- **`mousedown` is swallowed on the panel.** Without it, pressing a button blurs the editor, the selection collapses, and the menu hides *before* the click handler runs its command — the button would appear dead. Preventing the default on `mousedown` keeps focus and selection in the editing surface.
- **The panel is inserted next to the app root**, so it escapes the editor's overflow and stacking context, and it copies the nearest `[data-theme]` from the editor — floating content is a DOM sibling of the page, not of the editor, so it would otherwise resolve theme variables against the wrong scope.
- **All of the imperative wiring lives in a `behavior()`.** The event subscriptions, the `autoUpdate` cleanup, and the inserted panel node attach once per real DOM node; re-rendering the host routes fresh props into that same instance instead of leaving listeners bound to an orphaned closure. This is the pattern described in [reused-node lifecycle](/docs/core/lifecycle) and used by every `@domphy/ui` overlay.

[← Back to @domphy/editor](/docs/editor/)
