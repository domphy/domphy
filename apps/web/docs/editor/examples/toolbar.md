---
title: "@domphy/editor — Toolbar"
description: "A full formatting toolbar composed from @domphy/ui buttons, with pressed states and enabled/disabled states derived from the editor through editorState()."
---

# Toolbar

<script setup lang="ts">
import ToolbarDemo from "../../demos/editor/toolbar.ts?raw"
</script>

A complete formatting bar — marks, headings, lists, quote, undo/redo — above an editing surface. No toolbar patch ships with `@domphy/editor`: a toolbar is buttons, and `@domphy/ui` already has buttons. Move the cursor around the document and watch the pressed states follow it.

<CodeEditor :code="ToolbarDemo" />

## How it works

- **`editorState(editor)`** returns the two reader shapes a toolbar needs. `isActive("bold")` is a listener function `(l) => boolean`, so binding it to `ariaPressed` is enough to make the button track the cursor — under the hood it reads `editor.stateVersion` with the listener, which subscribes to every transaction. See [reading editor state](/docs/editor/#reading-editor-state-reactively).
- **`isActive("heading", { level: 1 })`** matches attributes as a *subset*, which is why the H1 and H2 buttons can share one node type and still light up independently. `isActive("heading")` with no attrs would match any level.
- **Pressed styling through the attribute, not a second State**: the button declares `"&[aria-pressed=true]"` in its own `style`, so the active look is pure CSS driven by the one reactive attribute. No parallel `toState(false)` to keep in sync, and no re-render of the button element on every keystroke.
- **`read((editor) => editor.can().undo())`** drives the disabled state. `can()` runs the command with `dispatch: undefined` — it reports feasibility without touching the document, so asking is free on every transaction. See [Commands](/docs/editor/api#commands).
- **`.chain().focus().toggleBold().run()`** is one transaction, so the focus restore and the format change land as a single history entry — <kbd>Mod-z</kbd> undoes the formatting, not the focus. `focus()` matters because clicking a button moved focus to the button.
- **`separator()` is a factory, not a shared constant**: the same element object appearing three times in one children list would hand reconciliation three references to one object. One object per position keeps node identity honest — see [reused-node lifecycle](/docs/core/lifecycle).
- **Layout comes from patches**: `toolbar({ gap: 1 })` for the button row (a semantic alias of `row()`), `stack({ gap: 2 })` for the bar-above-editor column. No hand-rolled `display: flex`.

[← Back to @domphy/editor](/docs/editor/)
