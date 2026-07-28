import { Extension } from "../Extendable";
import type { ExtensionThis } from "../types";

export interface TrailingNodeOptions {
  /** Node type appended at the end of the document. */
  node: string;
  /**
   * Node types after which no trailing node is added. `node` itself is always
   * included, otherwise appending one would trigger appending the next.
   */
  notAfter: string[];
}

/**
 * Append the trailing node unless the document already ends in one of the
 * types that make it unnecessary.
 */
function ensureTrailingNode(context: ExtensionThis<TrailingNodeOptions>): void {
  const { editor, options } = context;
  const content = editor.state.doc.content ?? [];
  const lastChild = content[content.length - 1];

  if (
    lastChild &&
    [...options.notAfter, options.node].includes(lastChild.type ?? "")
  ) {
    return;
  }

  editor.commands.command(({ tr }) => {
    // The trailing node is scaffolding, not an edit worth undoing on its own.
    tr.setMeta("addToHistory", false);
    // transform() appends without touching the selection, so the caret stays
    // wherever the edit that triggered this left it.
    tr.transform((doc) => ({
      ...doc,
      content: [...(doc.content ?? []), { type: options.node }],
    }));
    return true;
  });
}

/**
 * Keep a text position available at the end of the document.
 *
 * Without it a document ending in a leaf block — a horizontal rule, say — has
 * nowhere to put the caret after that block.
 */
export const TrailingNode = Extension.create<TrailingNodeOptions>({
  name: "trailingNode",

  addOptions() {
    return {
      node: "paragraph",
      notAfter: ["paragraph"],
    };
  },

  onCreate() {
    ensureTrailingNode(this);
  },

  onUpdate() {
    ensureTrailingNode(this);
  },
});
