import { Node } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { wrappingInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface BulletListOptions {
  /** HTML attributes added to every rendered bullet list. */
  HTMLAttributes: Attributes;
}

/** Matches a bullet list typed as `- `, `+ ` or `* `. */
export const inputRegex = /^\s*([-+*])\s$/;

/** An unordered list of `listItem` nodes. */
export const BulletList = Node.create<BulletListOptions>({
  name: "bulletList",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "block list",

  content: "listItem+",

  parseHTML() {
    return [{ tag: "ul" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      toggleBulletList:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleList(this.name, "listItem"),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": ({ editor }) => editor.commands.toggleBulletList(),
    };
  },

  addInputRules(): InputRule[] {
    return [wrappingInputRule({ find: inputRegex, type: this.name })];
  },
});
