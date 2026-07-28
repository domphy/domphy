import { Mark } from "../Extendable";
import type { Attributes, CommandProps, RawCommands } from "../types";
import { mergeAttributes } from "./mergeAttributes";

export interface UnderlineOptions {
  /** HTML attributes added to every rendered underline element. */
  HTMLAttributes: Attributes;
}

/** Underlined text, rendered as `<u>`. */
export const Underline = Mark.create<UnderlineOptions>({
  name: "underline",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // ponytail: tag rule only — ParseRule has no style matching, so
  // `style="text-decoration: underline"` is not picked up.
  parseHTML() {
    return [{ tag: "u" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "u",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setUnderline:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.setMark(this.name),
      toggleUnderline:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleMark(this.name),
      unsetUnderline:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-u": ({ editor }) => editor.commands.toggleUnderline(),
      "Mod-U": ({ editor }) => editor.commands.toggleUnderline(),
    };
  },
});
