# @domphy/editor Changelog

## 0.3.0

- **Paste of `text/plain` is no longer parsed as HTML.** Clipboard text is inserted as literal text, split into one block per line as an open slice (the first and last line merge into the block holding the caret), verbatim inside a `code` textblock. Pasting `<b>x</b>` as plain text used to produce real bold markup.
- **HTML paste skips `script`/`style`/`object`/`title`/`head`/`noscript` subtrees** instead of harvesting their text — prosemirror-model's `ignoreTags` set. Pasting a real web page used to inject its CSS and JavaScript source as paragraphs.
- **<kbd>Enter</kbd> inside a `code` textblock inserts a newline** instead of splitting the block (prosemirror-commands `newlineInCode`). Multi-line code blocks were not typable.
- **<kbd>Backspace</kbd> at the start of a block with nothing before it lifts that block** (prosemirror-commands `joinBackward`) — the first list item now outdents; a top-level paragraph still no-ops.
- `commands.setContent` / `insertContent` apply the same `Link.isAllowedUri` guard the `new Editor({ content })` path applies, so a `javascript:` href in JSON content no longer survives as an empty `<a>` that `getJSON()` denies.
- `bubbleMenu()` panel carries an accessible name (new `label` prop, default `"Formatting"` — axe `aria-toolbar-name`) and is dismissible with <kbd>Escape</kbd> without moving focus out of the editor.
- **`bubbleMenu()` is now reachable by keyboard.** A blur whose `relatedTarget` is inside the panel no longer hides it (tiptap's `BubbleMenuPlugin.blurHandler`): previously <kbd>Tab</kbd> hid the panel mid-focus-move, so the browser found nothing where it was about to land and focus fell to `<body>` — the toolbar could not be reached at all. <kbd>Escape</kbd> from inside the panel returns focus to the text, the dismissal survives that refocus, and focus leaving the panel for anything outside the editor hides it.
- `bubbleMenu()` no longer throws out of floating-ui's async positioning when the DOM `Range` cannot measure itself (jsdom implements neither rect method) — consumers testing a bubble menu under jsdom were getting unhandled promise rejections.
- Blockquote text in `editorContent()` uses the `text` tone, not `muted`: measured 4.06:1 (light) / 4.24:1 (dark), below WCAG AA.
- Link `openOnClick` opens with `noopener`, so the opened page gets no `window.opener` back (the anchor's own `rel` never applies once the handler has preventDefault-ed the navigation).
- **Drops are handled.** Dragging a selection inside the editor moves it (one transaction, one undo step); the platform copy modifier (<kbd>Alt</kbd> on macOS, <kbd>Ctrl</kbd> elsewhere) copies instead, and dropping a moved range inside itself does nothing. A drop from elsewhere inserts its `text/html` through the schema, or its `text/plain` literally, at the pointer. `dragover`/`dragenter` are cancelled so the editable is a drop target at all. The `onDrop` option still runs first and still wins, and a drop carrying no text — a file — is left entirely to it. Previously every drop was simply cancelled.
- **`bubbleMenu()`'s `role="toolbar"` implements the WAI-ARIA APG toolbar pattern.** Roving `tabindex` makes the panel a single tab stop, with <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> (wrapping) and <kbd>Home</kbd>/<kbd>End</kbd> moving between controls; it is re-applied on every open so reactive children cannot add a second tab stop. Every button used to be its own tab stop.
- **Table row and column commands honour `colspan`/`rowspan`**, via a port of prosemirror-tables' `TableMap`. Inserting a column next to a merged cell widens that cell instead of tearing the grid; deleting a row shortens the cells spanning into it and pushes down the ones starting in it; deleting a column that a cell straddles narrows it; a command driven from a merged cell acts on its whole rectangle; and a row emptied by a column delete is refilled, as ProseMirror's content fitting does. `deleteRow`/`deleteColumn` now refuse only when the cell's rectangle covers the whole table. All 128 cases are checked against prosemirror-tables 1.8.5 itself, which also turned up an upstream bug in its `addRow` (a new row comes out one cell short after a cell that is both `colspan > 1` and vertically spanning) — this port emits the complete row.
- Table cells are built with `schema.createNode()`, so added cells carry the default `colspan`/`rowspan`/`colwidth` like every hydrated cell.

## 0.2.5

- `createEditor` forces `element: null` (passing `element` is ignored so the helper never mounts).
- `EditorContentProps` includes `color` / `accentColor` / `minHeight` (host CSS-in-JS via `generateCSS()`).

## 0.2.4

- Link URI validation, command wiring, bubbleMenu/editorContent audit-fix pass.

## 0.2.3

- Peer range widened: `@domphy/theme` now accepts `^0.21.0 || ^0.22.0` — theme 0.22.0 is additive (palette re-export), and every theme API editor uses (`themeColor`/`themeSpacing`) is unchanged. Removes the peer warning for consumers on theme 0.22.x.

## 0.2.2

- Cross-depth delete no longer produces schema-invalid documents — `mergeNodes` carries separate left/right depths (ProseMirror slice-closing semantics).
- IME resync strips the placeholder trailing `<br>` instead of manufacturing phantom `hardBreak` nodes; word-delete input types delete whole words instead of single chars.
- Link is `inclusive: false`; autolink-on-Enter folds into one undo step; table commands replace by path and remap the selection after row/column ops; `editorContent()` dev-warns when the host declares children.

## 0.2.1

- `EditorViewLike.coordsAtPos(pos?)`: viewport coordinates (DOMRect) of the caret at a model position (defaults to the current selection head), for anchoring floating UI like slash menus; `null` when the position cannot be resolved to the DOM.

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
