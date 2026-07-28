import type { DomphyElement, Listener } from "@domphy/core";
import { starterKit } from "@domphy/editor";
import {
  bubbleMenu,
  createEditor,
  editorContent,
  editorState,
} from "@domphy/editor/domphy";
import { themeColor, themeSpacing } from "@domphy/theme";
import { buttonGhost } from "@domphy/ui";

const editor = createEditor({
  extensions: [starterKit()],
  content: `
    <h2>Select some text</h2>
    <p>
      Drag across any of these words and a small menu appears above the
      selection. It is anchored to the selection rectangle itself, not to the
      editor box, so it follows the text as you scroll or resize.
    </p>
    <p>The menu hides again as soon as the selection collapses or the editor loses focus.</p>
  `,
});

const { isActive } = editorState(editor);

const menuButton = (
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

const App: DomphyElement<"div"> = {
  div: null,
  $: [
    editorContent(editor),
    bubbleMenu(editor, {
      // Only offer inline marks — a selection sitting inside a code block has
      // no use for them, so the menu stays out of the way there.
      shouldShow: (current) =>
        !current.state.selection.empty && !current.isActive("codeBlock"),
      children: {
        div: [
          menuButton("B", isActive("bold"), () =>
            editor.chain().focus().toggleBold().run(),
          ),
          menuButton("I", isActive("italic"), () =>
            editor.chain().focus().toggleItalic().run(),
          ),
          menuButton("S", isActive("strike"), () =>
            editor.chain().focus().toggleStrike().run(),
          ),
          menuButton("Code", isActive("code"), () =>
            editor.chain().focus().toggleCode().run(),
          ),
        ],
      },
    }),
  ],
};

export default App;
