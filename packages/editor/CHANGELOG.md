# @domphy/editor Changelog

## 0.2.0

- Node views: `addNodeView` on `Node.create` — plain-DOM `{ dom, contentDOM?, update?, selectNode?, deselectNode?, destroy? }` instances that survive re-renders (path+type identity; `update()` returning false rebuilds), with `updateAttributes`/`getPos`/`selected`.
- View hooks: `onPaste` / `onDrop` / `onKeyDown` editor options (tiptap `editorProps.handle*` analogue; return true = handled; drop is preventDefault-by-default to protect the model).
- `onUpdate` / `update` event now emits `{ editor, transaction }` — `transaction.getMeta()` works as a programmatic-change loop guard.
- New extensions: `Underline` (in starterKit, matching upstream v3), `Table`/`TableRow`/`TableCell`/`TableHeader` subset — `insertTable`/`deleteTable`/`goToNextCell`/`goToPreviousCell`/`addRowAfter`/`deleteRow`/`addColumnAfter`/`deleteColumn`, Tab navigation (uniform grid; spans stored but ignored by row/column commands).
- Link `autolink` (default true): typed `https://…`/`www.…` + space/Enter links the word, trims trailing punctuation, validates via `isAllowedUri`.
- Real-browser fix pass (27 puppeteer scenarios): shadow-root selection support, `white-space` enforcement on the host, textblock-anchored selection restore across wrap/lift, leaf-block insert keeps the emptied paragraph (caret not stranded), undo grouping splits on non-typing commands, `editor.view` reachable during first render.
- Serialization: string literal children in renderHTML specs (`["div", attrs, "Page break"]`); content expressions support alternation (`"(tableCell | tableHeader)+"`).

## 0.1.0

- Initial release: Tiptap-compatible headless rich-text editor with a self-contained engine (no ProseMirror dependency).
- `Editor`, `Extension.create` / `Node.create` / `Mark.create`, chainable commands (`chain()` / `can()`), `isActive`, JSON/HTML/text serialization.
- StarterKit extension set: document, text, paragraph, heading, bold, italic, strike, code, blockquote, bulletList, orderedList, listItem, hardBreak, horizontalRule, history, link, codeBlock.
- Domphy adapter at `@domphy/editor/domphy`: `editorContent()` patch and `bubbleMenu()` patch (anchored via `@domphy/floating`).
