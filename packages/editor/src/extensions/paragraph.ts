import { Node } from "../Extendable";
import type { Attributes, CommandProps, RawCommands } from "../types";
import { mergeAttributes } from "./mergeAttributes";

export interface ParagraphOptions {
  /** HTML attributes added to every rendered paragraph. */
  HTMLAttributes: Attributes;
}

/** The default block node. */
export const Paragraph = Node.create<ParagraphOptions>({
  name: "paragraph",

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "block",

  content: "inline*",

  parseHTML() {
    return [{ tag: "p" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setParagraph:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.setNode(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-0": ({ editor }) => editor.commands.setParagraph(),
    };
  },
});
