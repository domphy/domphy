import { Node } from "../Extendable";
import type { Attributes, CommandProps, RawCommands } from "../types";
import { mergeAttributes } from "./mergeAttributes";

export interface HardBreakOptions {
  /** Carry the active marks across the break. */
  keepMarks: boolean;
  /** HTML attributes added to every rendered break. */
  HTMLAttributes: Attributes;
}

/** A line break inside a textblock, rendered as `<br>`. */
export const HardBreak = Node.create<HardBreakOptions>({
  name: "hardBreak",

  addOptions() {
    return {
      keepMarks: true,
      HTMLAttributes: {},
    };
  },

  inline: true,

  group: "inline",

  selectable: false,

  parseHTML() {
    return [{ tag: "br" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["br", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  renderText() {
    return "\n";
  },

  addCommands(): RawCommands {
    return {
      setHardBreak:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.first([
            // Inside a code block a break exits the block instead.
            ({ commands: inner }) => inner.exitCode(),
            ({ tr, chain, editor }) => {
              const marks =
                tr.storedMarks ?? tr.resolve(tr.selection.from).marks();

              return chain()
                .insertContent({ type: this.name })
                .command(({ tr: next }) => {
                  if (this.options.keepMarks) {
                    next.setStoredMarks(
                      marks.filter(
                        (mark) =>
                          editor.schema.marks.get(mark.type)?.keepOnSplit !==
                          false,
                      ),
                    );
                  }

                  return true;
                })
                .scrollIntoView()
                .run();
            },
          ]),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": ({ editor }) => editor.commands.setHardBreak(),
      "Shift-Enter": ({ editor }) => editor.commands.setHardBreak(),
    };
  },
});
