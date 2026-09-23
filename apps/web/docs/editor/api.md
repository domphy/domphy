---
title: "@domphy/editor — API Reference"
description: "Editor options and instance members, the generic command set behind chain()/can(), and the three Domphy adapter exports: editorContent(), bubbleMenu(), and editorState()."
---

# API Reference

## `createEditor(options)`

Builds an editor without mounting it. The DOM host comes later from [`editorContent()`](#editorcontent-editor-props), which owns the mount/unmount lifecycle of the element it is applied to. Passing `element` here is ignored (`element` is forced to `null`) so this helper never mounts.

```ts
import { createEditor } from "@domphy/editor/domphy"

const editor = createEditor({
  extensions: [starterKit()],
  content: "<p>Hello</p>",
  editable: true,
  onUpdate: ({ editor }) => console.log(editor.getJSON()),
})
```

| Option | Type | Notes |
| --- | --- | --- |
| `content` | `string \| JSONContent \| JSONContent[] \| null` | HTML string or Tiptap-shaped JSON. |
| `extensions` | `AnyExtension[]` | Order does not matter; `priority` does. |
| `editable` | `boolean` | Defaults to `true`. |
| `autofocus` | `"start" \| "end" \| "all" \| number \| boolean \| null` | Where the cursor lands on mount. |
| `onCreate` / `onSelectionUpdate` | `({ editor }) => void` | |
| `onUpdate` | `({ editor, transaction }) => void` | `transaction` carries whatever `setMeta()` put on it. |
| `onFocus` / `onBlur` | `({ editor, event }) => void` | |
| `onDestroy` | `() => void` | |
| `onPaste` | `(event: ClipboardEvent, editor) => boolean` | Return `true` to mark it handled and skip the editor's own paste. |
| `onDrop` | `(event: DragEvent, editor) => boolean` | Same contract, and it runs first. Otherwise the editor handles the drop itself — see [Dropping](#dropping). |
| `onKeyDown` | `(event: KeyboardEvent, editor) => boolean` | Runs **before** the keymap, so returning `true` overrides an extension shortcut. |

Options can be changed after construction with `editor.setOptions(partial)`.

### Pasting

The built-in paste handler prefers `text/html` and falls back to `text/plain`.

- **`text/html`** is parsed through the schema, so it is a whitelist, not a sanitizer pass: only nodes and marks some extension declares a `parseHTML` rule for survive, and only the attributes those extensions declare are kept. Everything else — `<script>`, `<style>`, `<object>`, `<title>`, inline `on*` handlers, unknown tags — is dropped, and the subtrees of `script`/`style`/`object`/`title`/`head`/`noscript` are skipped entirely rather than harvested for their text (the same `ignoreTags` set prosemirror-model uses). `javascript:` and other unsafe `href` protocols are rejected by `Link.isAllowedUri`.
- **`text/plain`** is inserted as literal text — never re-parsed as HTML — with one block per line. Pasting `<b>x</b>` as plain text types those nine characters; pasting two lines makes two paragraphs. Inside a `code` textblock the newlines stay in the block.

Return `true` from the `onPaste` option to take over completely.

### Dropping

The `onDrop` option runs first: return `true` and the editor does nothing else, which is how a file drop (an image upload, say) is wired — a drop carrying no `text/html` or `text/plain` is otherwise ignored.

Otherwise the editor handles the drop the way `prosemirror-view` does. The browser is never allowed to edit the contenteditable itself, since that would rewrite the DOM behind the model; instead the drop position is read from the pointer and the content is inserted there.

- A drag that started **inside this editor, on the current selection, moves it**: the source range is deleted and re-inserted at the drop point, in one transaction and therefore one undo step. Holding the platform copy modifier (<kbd>Alt</kbd> on macOS, <kbd>Ctrl</kbd> elsewhere) copies instead. Dropping a moved range back inside itself does nothing.
- A drop from anywhere else inserts its `text/html` (parsed through the schema, same whitelist as paste) or, failing that, its `text/plain` (literal text, one block per line).

Content spanning several blocks lands as whole blocks, not merged into the block under the pointer — the same shape an HTML paste of that selection produces, since this engine has no open-slice model.

`transaction` on `onUpdate` is what makes a loop guard possible: tag your own programmatic writes and ignore them on the way back out, so syncing to a server does not re-trigger itself.

```ts
const editor = createEditor({
  onUpdate: ({ editor, transaction }) => {
    if (transaction.getMeta("fromServer")) return
    save(editor.getJSON())
  },
})

// Applying a remote change without tripping the save above:
editor.chain().setMeta("fromServer", true).setContent(incoming).run()
```

## Editor instance

| Member | Returns | Notes |
| --- | --- | --- |
| `commands` | `SingleCommands` | Each call runs on a fresh transaction and dispatches immediately. |
| `chain()` | `ChainedCommands` | Collects commands into ONE transaction; `run()` dispatches. |
| `can()` | `CanCommands` | Same commands with `dispatch: undefined` — never mutates. |
| `state` | `{ doc, selection, storedMarks }` | The current document and selection. |
| `stateVersion` | `State<number>` | Bumped once per transaction — the reactivity bridge. |
| `isActive(name, attrs?)` | `boolean` | Attribute matching is a subset test. |
| `getAttributes(nameOrType)` | `Attributes` | Attributes of the active node or mark. |
| `getJSON()` / `getHTML()` / `getText(options?)` | JSON / string / string | `getText({ blockSeparator })` defaults to `"\n\n"`. |
| `isEmpty` / `isEditable` / `isFocused` / `isDestroyed` | `boolean` | |
| `setEditable(editable, emitUpdate?)` | `void` | |
| `mount(element)` / `unmount()` / `destroy()` | `void` | `editorContent()` calls the first two for you. |
| `on(event, cb)` / `off(event, cb)` | `void` | Events: `create`, `update`, `selectionUpdate`, `focus`, `blur`, `destroy`. |

## Commands

`chain()` builds one transaction shared by every link. Each link runs and pushes its boolean result; **a failing link does not abort the chain**. `run()` dispatches once and returns true only if every link returned true.

```ts
editor.chain().focus().toggleBold().run()          // one transaction, one history entry
editor.commands.toggleBold()                       // its own transaction, dispatched immediately
editor.can().toggleBold()                          // would it apply? nothing is mutated
editor.can().chain().toggleBold().toggleItalic().run()
```

Every extension command is built out of this generic set, which is always available:

| Group | Commands |
| --- | --- |
| Content | `setContent(content, options?)`, `insertContent(content)`, `insertContentAt(position, content)` |
| Marks | `setMark(type, attrs?)`, `toggleMark(type, attrs?)`, `unsetMark(type)` |
| Nodes | `setNode(type, attrs?)`, `toggleNode(type, toggleType, attrs?)`, `updateAttributes(type, attrs)`, `clearNodes()` |
| Wrapping | `wrapIn(type, attrs?)`, `toggleWrap(type, attrs?)`, `lift(type, attrs?)` |
| Lists | `toggleList(listType, itemType, attrs?)`, `splitListItem(itemType)`, `sinkListItem(itemType)`, `liftListItem(itemType)` |
| Splitting | `splitBlock(options?)`, `exitCode()` |
| Selection | `setTextSelection(position)`, `selectAll()`, `deleteSelection()`, `deleteRange(range)` |
| Focus | `focus(position?)`, `blur()`, `scrollIntoView()` |
| Escape hatches | `command(fn)`, `first(commands)`, `setMeta(key, value)` |
| History | `undo()`, `redo()` |

A command receives `{ editor, tr, state, dispatch, chain, can, commands }` and returns whether it applied. `dispatch` is `undefined` during `can()`, so guard every mutation with it.

`setMeta("preventUpdate", true)` suppresses the `update` event for that transaction; the event is also skipped when the document did not actually change.

## Document JSON

The JSON is Tiptap's, exactly:

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Title" }] },
    { "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Bold" }] },
    { "type": "paragraph" }
  ]
}
```

Marks live on text nodes, never on wrappers. `attrs` is omitted when every attribute is at its default, and an empty `content` array is omitted entirely — an empty paragraph is just `{ "type": "paragraph" }`.

Positions are ProseMirror-style integer token positions: entering a non-leaf node costs 1, each character costs 1, a leaf node (`hardBreak`, `horizontalRule`) costs 1, leaving a node costs 1. This is what makes `from`/`to` and command semantics source-compatible with Tiptap.

## Node views

`addNodeView` on a `Node` hands rendering of that node to you. The instance is plain DOM — there is no framework wrapper and no Domphy element tree here, because the editor treats the returned subtree as an imperative island it must not reconcile.

```ts
import { Node } from "@domphy/editor"

const Chip = Node.create({
  name: "chip",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return { label: { default: "chip" } }
  },

  parseHTML() {
    return [{ tag: "span[data-chip]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, "data-chip": "" }]
  },

  addNodeView() {
    return ({ node, selected, updateAttributes }) => {
      const dom = document.createElement("span")
      dom.dataset.chip = ""
      dom.textContent = String(node.attrs?.label ?? "")
      dom.addEventListener("click", () => updateAttributes({ label: "clicked" }))

      return {
        dom,
        update(next) {
          // Same node type: repaint in place instead of rebuilding.
          if (next.type !== "chip") return false
          dom.textContent = String(next.attrs?.label ?? "")
          return true
        },
        selectNode: () => dom.classList.add("is-selected"),
        deselectNode: () => dom.classList.remove("is-selected"),
      }
    }
  },
})
```

`addNodeView()` runs once per extension and returns the factory; the factory runs per node instance with `NodeViewProps`:

| Prop | Type | Notes |
| --- | --- | --- |
| `node` | `JSONContent` | This node's JSON, including `attrs`. |
| `editor` | `EditorInstance` | |
| `selected` | `boolean` | True while the selection covers the node. |
| `updateAttributes(attrs)` | `void` | Patches this node's attrs in one transaction. |
| `getPos()` | `number` | The node's current document position, recomputed each render. |

The returned `NodeViewInstance`:

| Key | Type | Notes |
| --- | --- | --- |
| `dom` | `HTMLElement` | Required — the node's outer element. |
| `contentDOM` | `HTMLElement \| null` | Where children render. Omit for atom/leaf views. |
| `update(node)` | `boolean \| undefined` | Return `false` to make the editor throw the instance away and rebuild. |
| `selectNode()` / `deselectNode()` | `void` | Fired as `selected` flips. |
| `destroy()` | `void` | Called when the instance is discarded. |

Two ceilings are worth knowing before you lean on this.

**Identity is positional.** A rendering pass rebuilds the tree, and an instance is reused when a node of the same type sits at the same child-index path as last render. That covers the common case — attributes change and `update()` repaints in place — but inserting a *sibling before* a node view hands that instance to its neighbour. If your view holds state that must not migrate (a media element mid-playback, a third-party widget), check identity yourself in `update()` and return `false` when it does not match; the editor then destroys and rebuilds, which is always correct.

**`selected` is range coverage, not a node selection.** There is no `NodeSelection`, so clicking an atom node does not select it — only a text range that spans the node sets `selected`. Click-to-select has to be built in your own `dom` handler.

## Domphy adapter

### `editorContent(editor, props?)`

Mounts the editor into the host element and styles the editing surface with theme tokens. Apply it to a `div`.

```ts
{ div: null, $: [editorContent(editor, { minHeight: 60 })] }
```

| Prop | Type | Default |
| --- | --- | --- |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` — surface text and resting outline |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` — focus ring |
| `minHeight` | `number` | `40` — theme spacing units (`10em`) |

The mount runs through a `behavior()`, so it happens exactly once for the real DOM node no matter how many times a reactive ancestor re-renders the host; passing a different editor later swaps the view in place, and unmount runs once when the element leaves the DOM.

Typography inside the editable area is left to the theme and the browser's tag defaults — the content is real `p` / `h1`-`h6` / `strong` / `em` markup, so it inherits the document type scale. Only structural rhythm (block margins, list indent, quote and code chrome) is declared by the patch.

### `bubbleMenu(editor, props)`

A floating menu anchored to the current text selection. Apply it to the same host element as `editorContent()`.

```ts
{
  div: null,
  $: [
    editorContent(editor),
    bubbleMenu(editor, {
      shouldShow: (editor) => !editor.state.selection.empty && !editor.isActive("codeBlock"),
      children: { div: [boldButton, italicButton] },
    }),
  ],
}
```

| Prop | Type | Default |
| --- | --- | --- |
| `children` | `DomphyElement` | required — the menu content |
| `shouldShow` | `(editor) => boolean` | editable, with a non-empty selection |
| `label` | `string` | `"Formatting"` — accessible name for the `role="toolbar"` panel |

Positioning uses `@domphy/floating` against a *virtual element* wrapping the live selection rectangle: `getBoundingClientRect()` re-reads `getSelection().getRangeAt(0)` on every call, so scrolling and resizing reposition against the real current rect rather than a snapshot taken when the menu opened. The middleware chain is `inline()` (picks the right rect when a selection wraps across lines), `offset(8)`, `flip()` and `shift()`.

Show/hide is wired to the editor's `selectionUpdate`, `update`, `focus` and `blur` events from inside the behavior — not from a lifecycle hook — so it survives host re-renders. Destroying the editor also tears the panel down. The panel is portaled into a document/root overlay (never a child of the contenteditable host, which `EditorView.render()` wipes), escaping the editor's overflow and stacking context, and it swallows `mousedown` so pressing a button never blurs the editor and collapses the selection you are formatting.

**Keyboard.** The panel is reachable: <kbd>Tab</kbd> out of the editable area lands on the first menu button, because a blur whose `relatedTarget` is inside the panel is treated as focus *arriving* rather than a dismissal (tiptap's `BubbleMenuPlugin.blurHandler` does the same — hiding there would make the browser land on nothing and drop focus to `<body>`). <kbd>Escape</kbd> dismisses the panel; pressed from inside it, focus goes back to the text. A dismissal survives that refocus and is cleared by the next selection change or edit, and the keypress is not propagated further, so a dialog wrapping the editor does not close with it. Moving focus out of the panel to anything that is neither the panel nor the editor hides it.

The panel is a `role="toolbar"` and follows the WAI-ARIA APG toolbar pattern: it is a **single tab stop**, so <kbd>Tab</kbd> enters it once and <kbd>Tab</kbd> again leaves the editor entirely. <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> move between the controls and wrap, <kbd>Home</kbd>/<kbd>End</kbd> jump to the first/last, and the roving `tabindex` is re-applied whenever the panel opens, so reactive children cannot silently add a second tab stop. Name it with `label` (default `"Formatting"`), or give the host its own `aria-label`.

### `editorState(editor)`

Returns reader functions that re-evaluate on every transaction.

```ts
const { isActive, read } = editorState(editor)

isActive("bold")                        // (l) => boolean
isActive("heading", { level: 2 })       // (l) => boolean
read((editor) => editor.can().undo())   // (l) => boolean
read((editor) => editor.getText())      // (l) => string
```

There is nothing more to it than reading `editor.stateVersion` with the listener first, so anything not covered here can be written inline:

```ts
const wordCount = (l) => {
  editor.stateVersion.get(l)
  return editor.getText().split(/\s+/).filter(Boolean).length
}
```

## Deviations from Tiptap

Names and semantics match Tiptap, but the engine underneath is not ProseMirror, and a handful of behaviours differ. These are the ones that can change what your code does — read them before porting a non-trivial Tiptap integration.

| Area | Difference |
| --- | --- |
| Selection model | There is no `AllSelection` or `NodeSelection` — every selection is a text range. `selectAll()` spans the first to the last text position, so it selects the document's *content*, not the doc node itself. |
| `splitListItem()` | Pressing <kbd>Enter</kbd> in an empty list item lifts it out of the list. In Tiptap the command falls through and the surrounding keymap decides; here the lift is the command's own behaviour, so it applies wherever `splitListItem()` is called. |
| Blockquote <kbd>Backspace</kbd> | Lifts the block out of the quote when the cursor is at its start, and does nothing otherwise. There is no merge-into-the-preceding-blockquote step. |
| `CodeBlock` | The triple-<kbd>Enter</kbd> exit is unconditional — Tiptap's `exitOnTripleEnter` toggle does not exist. `exitOnArrowDown` and `enableTabIndentation` are dropped too; the options are `languageClassPrefix`, `defaultLanguage` and `HTMLAttributes`. |
| `Link` | `autolink` ships (default `true`): typing `https://…` or `www.…` followed by a space or <kbd>Enter</kbd> links the word, trims trailing punctuation, and still passes `isAllowedUri`. Bare domains without a scheme are not matched, and `linkOnPaste` is dropped (no paste rules) — a pasted URL needs `setLink({ href })`. The options are `openOnClick`, `autolink`, `protocols`, `isAllowedUri` and `HTMLAttributes`. |
| Lists | `itemTypeName`, `keepMarks` and `keepAttributes` are dropped; every list extension takes only `HTMLAttributes`. `OrderedList` has a `start` attribute but no `type`, so `<ol type="a">` does not round-trip. |
| Node views | Ported, but identity is positional: an instance is reused when a node of the same type sits at the same child-index path as the previous render, so inserting a sibling *before* a view hands that instance to its neighbour. Return `false` from `update()` to force a rebuild. See [Node views](#node-views). |
| `Table` | A subset of `prosemirror-tables`. The table map is ported, so `colspan`/`rowspan` are honoured by the row and column commands; what is missing is cell selection (a command acts on the cell holding the caret), merge/split commands and column resizing. |
| `UndoRedo` | Registers no commands of its own — `undo()` and `redo()` are generic engine commands that exist regardless. The extension carries only `depth`, `newGroupDelay` and the keymap, so disabling it removes the shortcuts, not the commands. |
| `getJSON()` | Omits `attrs` when every attribute is at its default, and omits empty `content` arrays — see [Document JSON](#document-json). Tiptap emits the same shape, but code that reads `node.attrs.level` without a fallback will break on a defaulted node. |

Whole features that are absent rather than merely different — mark views, paste rules, `registerPlugin`, `NodePos`, collaboration, gapcursor, dropcursor — are listed under [Coming from Tiptap](/docs/editor/#coming-from-tiptap).
