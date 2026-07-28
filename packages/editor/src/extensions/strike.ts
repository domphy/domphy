import { Mark } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { markInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface StrikeOptions {
  /** HTML attributes added to every rendered strike element. */
  HTMLAttributes: Attributes;
}

/** Matches struck text typed as `~~strike~~`. */
export const inputRegex = /(?:^|\s)(~~(?!\s+~~)((?:[^~]+))~~(?!\s+~~))$/;

/** Struck-through text, rendered as `<s>`. */
export const Strike = Mark.create<StrikeOptions>({
  name: "strike",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [{ tag: "s" }, { tag: "del" }, { tag: "strike" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "s",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setStrike:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.setMark(this.name),
      toggleStrike:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleMark(this.name),
      unsetStrike:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-s": ({ editor }) => editor.commands.toggleStrike(),
    };
  },

  addInputRules(): InputRule[] {
    return [markInputRule({ find: inputRegex, type: this.name })];
  },
});
