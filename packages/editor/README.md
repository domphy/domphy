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
