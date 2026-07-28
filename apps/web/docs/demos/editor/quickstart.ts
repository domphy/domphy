import type { DomphyElement } from "@domphy/core";
import { starterKit } from "@domphy/editor";
import { createEditor, editorContent } from "@domphy/editor/domphy";

// createEditor() builds the editor without a DOM host — editorContent() owns
// the mount, so the same editor can be moved between elements or read from
// outside the tree before anything is rendered.
const editor = createEditor({
  extensions: [starterKit()],
  content: `
    <h2>A self-contained editor</h2>
    <p>
      Select this text to see it is real <strong>rich text</strong>, not a
      <code>textarea</code>. Markdown input rules work too — start a line with
      <code># </code>, <code>- </code> or <code>&gt; </code>.
    </p>
    <ul><li>Bullet lists</li><li>Nested marks like <em>emphasis</em></li></ul>
  `,
});

const App: DomphyElement<"div"> = {
  div: null,
  $: [editorContent(editor)],
};

export default App;
