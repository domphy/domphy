import { Node } from "../Extendable";
import type { Attributes } from "../types";
import { mergeAttributes } from "./mergeAttributes";

export interface ListItemOptions {
  /** HTML attributes added to every rendered list item. */
  HTMLAttributes: Attributes;
}

/** A single entry of a bullet or ordered list. */
export const ListItem = Node.create<ListItemOptions>({
  name: "listItem",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "paragraph block*",

  defining: true,

  parseHTML() {
    return [{ tag: "li" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => editor.commands.splitListItem(this.name),
      Tab: ({ editor }) => editor.commands.sinkListItem(this.name),
      "Shift-Tab": ({ editor }) => editor.commands.liftListItem(this.name),
    };
  },
});
