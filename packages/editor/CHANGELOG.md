# @domphy/editor Changelog

## 0.1.0

- Initial release: Tiptap-compatible headless rich-text editor with a self-contained engine (no ProseMirror dependency).
- `Editor`, `Extension.create` / `Node.create` / `Mark.create`, chainable commands (`chain()` / `can()`), `isActive`, JSON/HTML/text serialization.
- StarterKit extension set: document, text, paragraph, heading, bold, italic, strike, code, blockquote, bulletList, orderedList, listItem, hardBreak, horizontalRule, history, link, codeBlock.
- Domphy adapter at `@domphy/editor/domphy`: `editorContent()` patch and `bubbleMenu()` patch (anchored via `@domphy/floating`).
