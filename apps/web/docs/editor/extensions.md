---
title: "@domphy/editor — Extensions"
description: "The starterKit() extension set (commands, keyboard shortcuts, input rules), how to configure or drop individual extensions, and how to write your own Node, Mark, or Extension."
---

# Extensions

Everything the editor can do comes from extensions. Three kinds, same as Tiptap:

- **`Node`** — a block or inline node in the document (`paragraph`, `heading`, `bulletList`).
- **`Mark`** — inline formatting applied to text (`bold`, `code`, `link`).
- **`Extension`** — no schema of its own, just commands/shortcuts/rules (`undoRedo`, `starterKit()`).

## starterKit()

`starterKit()` is an aggregate: it contributes no schema itself, it just returns the essential set from `addExtensions()`.

```ts
import { starterKit } from "@domphy/editor"
import { createEditor } from "@domphy/editor/domphy"

const editor = createEditor({ extensions: [starterKit()] })
```

| Extension | Commands | Shortcuts | Input rules |
| --- | --- | --- | --- |
| `Document` | — | — | — |
| `Text` | — | — | — |
| `Paragraph` | `setParagraph()` | <kbd>Mod-Alt-0</kbd> | — |
| `Heading` | `setHeading({ level })`, `toggleHeading({ level })` | <kbd>Mod-Alt-1</kbd>…<kbd>Mod-Alt-6</kbd> | `# ` … `###### ` |
| `Bold` | `setBold()`, `toggleBold()`, `unsetBold()` | <kbd>Mod-b</kbd> | `**text**`, `__text__` |
| `Italic` | `setItalic()`, `toggleItalic()`, `unsetItalic()` | <kbd>Mod-i</kbd> | `*text*`, `_text_` |
| `Strike` | `setStrike()`, `toggleStrike()`, `unsetStrike()` | <kbd>Mod-Shift-s</kbd> | `~~text~~` |
| `Code` | `setCode()`, `toggleCode()`, `unsetCode()` | <kbd>Mod-e</kbd> | `` `text` `` |
| `Blockquote` | `setBlockquote()`, `toggleBlockquote()`, `unsetBlockquote()` | <kbd>Mod-Shift-b</kbd> | `> ` |
| `BulletList` | `toggleBulletList()` | <kbd>Mod-Shift-8</kbd> | `- `, `+ `, `* ` |
| `OrderedList` | `toggleOrderedList()` | <kbd>Mod-Shift-7</kbd> | `1. ` |
| `ListItem` | — | <kbd>Enter</kbd> splits, <kbd>Tab</kbd> sinks, <kbd>Shift-Tab</kbd> lifts | — |
| `HardBreak` | `setHardBreak()` | <kbd>Mod-Enter</kbd>, <kbd>Shift-Enter</kbd> | — |
| `HorizontalRule` | `setHorizontalRule()` | — | `---`, `***` |
| `CodeBlock` | `setCodeBlock({ language })`, `toggleCodeBlock({ language })` | <kbd>Mod-Alt-c</kbd> | ` ```lang `, `~~~lang` |
| `Link` | `setLink({ href })`, `toggleLink({ href })`, `unsetLink()` | — | — |
| `UndoRedo` | `undo()`, `redo()` | <kbd>Mod-z</kbd>, <kbd>Shift-Mod-z</kbd>, <kbd>Mod-y</kbd> | — |

`Mod` is <kbd>Ctrl</kbd> on Windows and Linux, <kbd>Cmd</kbd> on macOS.

Two names are worth knowing because they differ from what you would guess:

- `Document`'s schema name is `"doc"`, not `"document"` — the `starterKit()` option key is `document`, but anything addressing the node type (`isActive`, content expressions) uses `"doc"`.
- `UndoRedo` registers no commands of its own. `undo()` and `redo()` are generic engine commands that exist regardless; the extension only carries `depth`/`newGroupDelay` and the keymap, so dropping it with `undoRedo: false` removes the shortcuts, not the commands.

## Configuring the kit

Every key of the `starterKit()` options object takes that sub-extension's options, or `false` to leave it out entirely:

```ts
starterKit({
  heading: { levels: [1, 2, 3] },   // only H1-H3, so only Mod-Alt-1..3 bind
  codeBlock: false,                 // drop code blocks (and their input rules)
  undoRedo: { depth: 50, newGroupDelay: 300 },
  link: { HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
})
```

Individual extensions are also exported by name, so you can skip the kit and assemble the set yourself. `Document`, `Text` and `Paragraph` are the minimum a working document needs:

```ts
import { Bold, Document, Italic, Paragraph, Text } from "@domphy/editor"

const editor = createEditor({ extensions: [Document, Paragraph, Text, Bold, Italic] })
```

## `configure()` vs `extend()`

`configure(options)` deep-merges over the result of `addOptions()` and returns a new instance — the config hooks are untouched. `extend(config)` replaces hooks; inside a replaced hook, `this.parent` is the same hook from the extended config, which is how you add to a hook instead of overwriting it:

```ts
const HeadingWithBigShortcut = Heading.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      "Mod-Alt-9": ({ editor }) => editor.commands.toggleHeading({ level: 1 }),
    }
  },
})
```

Every config hook is called with `this` bound to `{ name, options, storage, editor, parent }`.

## Writing an extension

A `Mark` needs a name, how it parses out of HTML, how it renders back, and the commands it contributes:

```ts
import { Mark, mergeAttributes } from "@domphy/editor"

const Highlight = Mark.create({
  name: "highlight",

  parseHTML() {
    return [{ tag: "mark" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      toggleHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    }
  },

  addKeyboardShortcuts() {
    return { "Mod-Shift-h": ({ editor }) => editor.commands.toggleHighlight() }
  },
})
```

Commands are curried: the outer function takes the caller's arguments, the inner one takes `CommandProps` and returns whether it applied. A command must check `dispatch` before mutating the transaction — `can()` runs commands with `dispatch: undefined` precisely so it can ask "would this work?" without changing anything:

```ts
addCommands() {
  return {
    clearHighlight:
      () =>
      ({ tr, state, dispatch }) => {
        const { from, to } = state.selection
        if (from === to) return false
        if (dispatch) tr.removeMark(from, to, this.name)
        return true
      },
  }
}
```

Node extensions add `content`, `group`, and `addAttributes`. Attributes declare a default and are omitted from JSON when every attribute is at its default:

```ts
import { Node, mergeAttributes } from "@domphy/editor"

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return { tone: { default: "info" } }
  },

  parseHTML() {
    return [{ tag: "aside[data-callout]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes({ "data-callout": "" }, HTMLAttributes), 0]
  },
})
```

`priority` (default `100`, higher runs first) decides ordering when two extensions register the same shortcut or parse rule — `Paragraph` and `Link` both use `1000`.

## Next steps

- [API Reference](./api) — editor options, the generic command set, and the adapter exports
- [Toolbar example](./examples/toolbar) — wiring these commands to buttons
