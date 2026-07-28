---
title: "@domphy/editor"
description: "A rich-text editor with a Tiptap-compatible API on a self-contained engine — no ProseMirror, no virtual DOM, with a Domphy adapter for mounting, reactive toolbars, and a selection-anchored bubble menu."
---

<script setup lang="ts">
import Quickstart from "../demos/editor/quickstart.ts?raw"
</script>

# @domphy/editor

`@domphy/editor` is a rich-text editor whose public API is source-compatible with [Tiptap](https://tiptap.dev) — `Editor`, `Extension`/`Node`/`Mark`, chainable commands, `starterKit()` — implemented on an engine of its own. There is no ProseMirror underneath: the document is plain Tiptap-shaped JSON, positions are ProseMirror-style integer token positions, and the view is a `contenteditable` host driven by `beforeinput`.

Two layers ship in one package:

- **`@domphy/editor`** — the framework-agnostic editor. It knows nothing about Domphy elements; you can drive it from any DOM.
- **`@domphy/editor/domphy`** — the Domphy adapter: `createEditor`, the `editorContent()` and `bubbleMenu()` patches, and the `editorState()` reactivity bridge.

## Install

```bash
npm install @domphy/editor
```

Peer dependencies: `@domphy/core` and `@domphy/theme`.

## Quick start

`createEditor()` builds the editor without a DOM host. The `editorContent()` patch owns the mount: apply it to a `div` and that element becomes the editing surface, styled with theme tokens.

<CodeEditor :code="Quickstart" />

Typing `# `, `- `, `> ` or `**bold**` applies the matching input rule, and <kbd>Mod</kbd>+<kbd>B</kbd> / <kbd>Mod</kbd>+<kbd>I</kbd> / <kbd>Mod</kbd>+<kbd>Z</kbd> work as expected — those come from `starterKit()`, not from the adapter.

## Reading editor state reactively

The editor exposes `stateVersion`, a Domphy `State<number>` bumped once per transaction. Reading it with a listener subscribes that listener to every edit, which is the entire reactivity bridge:

```ts
const isBold = (l) => {
  editor.stateVersion.get(l)
  return editor.isActive("bold")
}

const boldButton = { button: "B", ariaPressed: isBold, onClick: () => editor.chain().focus().toggleBold().run() }
```

`editorState(editor)` names the two shapes that show up in every toolbar so you do not repeat the `stateVersion.get(l)` line:

```ts
import { editorState } from "@domphy/editor/domphy"

const { isActive, read } = editorState(editor)

isActive("bold")                          // (l) => boolean
isActive("heading", { level: 2 })         // (l) => boolean — attrs are a subset match
read((editor) => editor.can().undo())     // (l) => boolean
read((editor) => editor.getText())        // (l) => string
```

## Coming from Tiptap

The editor half is a straight port — same names and semantics, with the exceptions listed in [Deviations from Tiptap](./api#deviations-from-tiptap):

| Tiptap | `@domphy/editor` |
| --- | --- |
| `new Editor({ element, extensions })` | `createEditor({ extensions })` + `editorContent(editor)` patch |
| `import StarterKit from "@tiptap/starter-kit"` | `import { starterKit } from "@domphy/editor"` |
| `editor.chain().focus().toggleBold().run()` | identical |
| `editor.can().toggleBold()` | identical |
| `editor.isActive("heading", { level: 2 })` | identical |
| `<EditorContent editor={editor} />` (React) | `{ div: null, $: [editorContent(editor)] }` |
| `<BubbleMenu editor={editor}>…</BubbleMenu>` | `bubbleMenu(editor, { children })` patch |
| `useEditorState(...)` / `editor.on("transaction")` | `editor.stateVersion` / `editorState(editor)` |

Node views **are** ported — `addNodeView` builds a plain-DOM instance, with no framework wrapper; see [Node views](./api#node-views). `editorProps.handle*` has an analogue too: the `onPaste`/`onDrop`/`onKeyDown` [editor options](./api#createeditoroptions).

What is deliberately **not** ported, because it is ProseMirror-specific: `registerPlugin`/`unregisterPlugin`, mark views, `NodePos`, paste rules, collaboration, gapcursor, and dropcursor.

One serialization difference: `getJSON()` omits `attrs` whose values all equal their defaults, so a level-1 heading serializes as `{ "type": "heading" }` where Tiptap emits `"attrs": { "level": 1 }`. `fromJSON`/`setContent` accept both forms, so Tiptap-produced JSON loads unchanged — only byte-for-byte output comparison differs.

## Next steps

- [Extensions](./extensions) — the `starterKit()` set, its options, and writing your own
- [API Reference](./api) — editor options, commands, and the three adapter exports
- [Toolbar example](./examples/toolbar) — a full toolbar composed from `@domphy/ui`
- [Bubble Menu example](./examples/bubble-menu) — a menu anchored to the selection
