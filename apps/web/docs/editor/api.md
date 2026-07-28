---
title: "@domphy/editor — API Reference"
description: "Editor options and instance members, the generic command set behind chain()/can(), and the three Domphy adapter exports: editorContent(), bubbleMenu(), and editorState()."
---

# API Reference

## `createEditor(options)`

Builds an editor without mounting it. The DOM host comes later from [`editorContent()`](#editorcontent-editor-props), which owns the mount/unmount lifecycle of the element it is applied to — passing `element` here would mount twice.

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
| `onCreate` / `onUpdate` / `onSelectionUpdate` | `({ editor }) => void` | |
| `onFocus` / `onBlur` | `({ editor, event }) => void` | |
| `onDestroy` | `() => void` | |

Options can be changed after construction with `editor.setOptions(partial)`.

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

Positioning uses `@domphy/floating` against a *virtual element* wrapping the live selection rectangle: `getBoundingClientRect()` re-reads `getSelection().getRangeAt(0)` on every call, so scrolling and resizing reposition against the real current rect rather than a snapshot taken when the menu opened. The middleware chain is `inline()` (picks the right rect when a selection wraps across lines), `offset(8)`, `flip()` and `shift()`.

Show/hide is wired to the editor's `selectionUpdate`, `update`, `focus` and `blur` events from inside the behavior — not from a lifecycle hook — so it survives host re-renders. The panel is inserted next to the app root, escaping the editor's overflow and stacking context, and it swallows `mousedown` so pressing a button never blurs the editor and collapses the selection you are formatting.

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
