import type { DomphyElement, Listener } from "@domphy/core";
import {
  starterKit,
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@domphy/editor";
import {
  createEditor,
  editorContent,
  editorState,
} from "@domphy/editor/domphy";
import { themeColor, themeSpacing } from "@domphy/theme";
import { buttonGhost, stack, toolbar } from "@domphy/ui";

const editor = createEditor({
  // Tables are not part of starterKit — all four node types are needed.
  extensions: [starterKit(), Table, TableRow, TableHeader, TableCell],
  content: `
    <h2>Toolbar</h2>
    <p>Every button below reads the editor through <code>editorState()</code>, so the pressed states follow the cursor as you move it around.</p>
    <blockquote><p>Put the cursor in here and watch the quote button light up.</p></blockquote>
  `,
});

// The whole reactivity bridge: reading editor.stateVersion with a listener
// subscribes that listener to every editor transaction. editorState() just
// wraps the two shapes a toolbar needs.
const { isActive, read } = editorState(editor);

/**
 * A toolbar toggle. `active` is a listener function so the pressed state
 * re-evaluates on every transaction; `run` fires the command and hands focus
 * back to the editing surface.
 */
const toggleButton = (
  label: string,
  active: (listener: Listener) => boolean,
  run: () => void,
): DomphyElement<"button"> => ({
  button: label,
  type: "button",
  title: label,
  ariaPressed: active,
  onClick: run,
  $: [buttonGhost({ size: "small" })],
  style: {
    minWidth: themeSpacing(9),
    "&[aria-pressed=true]": {
      backgroundColor: (listener) => themeColor(listener, "hover", "primary"),
      color: (listener) => themeColor(listener, "text", "primary"),
    },
  },
});

const actionButton = (
  label: string,
  enabled: (listener: Listener) => boolean,
  run: () => void,
): DomphyElement<"button"> => ({
  button: label,
  type: "button",
  title: label,
  disabled: (listener) => !enabled(listener),
  onClick: run,
  $: [buttonGhost({ size: "small" })],
});

// A factory, not a shared constant: one element object per position in the
// children list, so reconciliation never sees the same object three times.
const separator = (): DomphyElement<"div"> => ({
  div: null,
  role: "separator",
  ariaOrientation: "vertical",
  style: {
    alignSelf: "stretch",
    // A hairline rule, drawn as a border rather than a filled background:
    // backgroundColor must always resolve to the inherited surface tone.
    borderInlineStart: (listener) =>
      `${themeSpacing(0.25)} solid ${themeColor(listener, "border")}`,
    color: (listener) => themeColor(listener, "text"),
  },
});

const App: DomphyElement<"div"> = {
  div: [
    {
      div: [
        toggleButton("B", isActive("bold"), () =>
          editor.chain().focus().toggleBold().run(),
        ),
        toggleButton("I", isActive("italic"), () =>
          editor.chain().focus().toggleItalic().run(),
        ),
        toggleButton("U", isActive("underline"), () =>
          editor.chain().focus().toggleUnderline().run(),
        ),
        toggleButton("S", isActive("strike"), () =>
          editor.chain().focus().toggleStrike().run(),
        ),
        toggleButton("Code", isActive("code"), () =>
          editor.chain().focus().toggleCode().run(),
        ),
        separator(),
        toggleButton("H1", isActive("heading", { level: 1 }), () =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
        ),
        toggleButton("H2", isActive("heading", { level: 2 }), () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        ),
        separator(),
        toggleButton("List", isActive("bulletList"), () =>
          editor.chain().focus().toggleBulletList().run(),
        ),
        toggleButton("1.", isActive("orderedList"), () =>
          editor.chain().focus().toggleOrderedList().run(),
        ),
        toggleButton("Quote", isActive("blockquote"), () =>
          editor.chain().focus().toggleBlockquote().run(),
        ),
        separator(),
        actionButton(
          "Table",
          () => true,
          () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
        ),
        separator(),
        actionButton(
          "Undo",
          read((current) => current.can().undo()),
          () => editor.chain().focus().undo().run(),
        ),
        actionButton(
          "Redo",
          read((current) => current.can().redo()),
          () => editor.chain().focus().redo().run(),
        ),
      ],
      $: [toolbar({ gap: 1 })],
      style: { flexWrap: "wrap" },
    },
    { div: null, $: [editorContent(editor)] },
  ],
  $: [stack({ gap: 2 })],
};

export default App;
