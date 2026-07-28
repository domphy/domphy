import { Node } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { wrappingInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface BlockquoteOptions {
  /** HTML attributes added to every rendered blockquote. */
  HTMLAttributes: Attributes;
}

/** Matches a blockquote typed as `> `. */
export const inputRegex = /^\s*>\s$/;

/** A block wrapper for quoted content. */
export const Blockquote = Node.create<BlockquoteOptions>({
  name: "blockquote",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: "block+",

  group: "block",

  defining: true,

  parseHTML() {
    return [{ tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setBlockquote:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.wrapIn(this.name),
      toggleBlockquote:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleWrap(this.name),
      unsetBlockquote:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.lift(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-b": ({ editor }) => editor.commands.toggleBlockquote(),

      // Backspace at the start of a quoted block lifts it out of the quote.
      Backspace: ({ editor }) =>
        editor.commands.command(({ tr, commands }) => {
          const { selection } = tr;

          if (!selection.empty) {
            return false;
          }

          const position = tr.resolve(selection.from);

          if (position.parentOffset !== 0) {
            return false;
          }

          const wrapperDepth = position.depth - 1;

          if (
            wrapperDepth < 0 ||
            position.node(wrapperDepth).type !== this.name
          ) {
            return false;
          }

          return commands.lift(this.name);
        }),
    };
  },

  addInputRules(): InputRule[] {
    return [wrappingInputRule({ find: inputRegex, type: this.name })];
  },
});
