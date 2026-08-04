# @domphy/editor

Headless rich-text editor for [Domphy](https://domphy.com) with a **Tiptap-compatible API** on a **self-contained engine** — no ProseMirror, no external runtime dependencies.

- `Editor`, `Extension.create` / `Node.create` / `Mark.create`, chainable commands (`chain()` / `can()`), `isActive`, JSON/HTML/text serialization — the API you know from Tiptap.
- StarterKit extension set: document, text, paragraph, heading, bold, italic, strike, code, blockquote, bulletList, orderedList, listItem, hardBreak, horizontalRule, history (undo/redo), link, codeBlock.
- Domphy adapter at `@domphy/editor/domphy`: `editorContent()` patch and a selection-anchored `bubbleMenu()` patch (positioned via `@domphy/floating`).

## Install

```sh
npm install @domphy/editor @domphy/core @domphy/theme
```

## Usage

```ts
import { Editor, starterKit } from "@domphy/editor"
import { editorContent, bubbleMenu } from "@domphy/editor/domphy"

const editor = new Editor({
  content: "<p>Hello <strong>Domphy</strong></p>",
  extensions: [starterKit()],
  onUpdate: ({ editor }) => console.log(editor.getJSON()),
})

const App = {
  div: null,
  $: [editorContent(editor)],
}

editor.chain().focus().toggleBold().run()
editor.isActive("bold")
```

Docs: https://domphy.com/docs/editor/

## Intentional non-goals

Deliberate limitations of the engine — documented behavior, not bugs:

- **No `NodeSelection`.** Every selection is a text range, so clicking an atom
  node does not select it; node views get `selectNode` only when a range spans
  them. Click-to-select can be built in a node view's own `dom` handler.
- **No built-in drop-into-document handling.** Native drops are
  `preventDefault`-ed so the browser cannot rewrite the DOM behind the model;
  wire the `onDrop` editor option to implement dropping.
- **Table row/column commands assume a uniform grid.** `colspan`/`rowspan` are
  parsed, stored and rendered, but the row and column commands ignore spans, so
  merged cells will drift. Fixing this needs a port of prosemirror-tables'
  `TableMap`; there is also no cell selection and no column resizing.
- **Deleting the whole document resets the block type.** What remains is the
  schema's default textblock (paragraph), not an empty heading — the same
  outcome as Tiptap's select-all + delete. Because there is no `NodeSelection`
  to tell "select all" apart from "select every character", drag-selecting all
  of a single block's text and deleting resets that block too (Tiptap keeps
  the block type in that drag case).

See the [API reference](https://domphy.com/docs/editor/api#deviations-from-tiptap)
for the full deviations list.
