import { Mark } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { markInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface CodeOptions {
  /** HTML attributes added to every rendered code element. */
  HTMLAttributes: Attributes;
}

/**
 * Matches inline code typed as `` `code` ``. The lookbehind keeps a doubled
 * opening backtick from starting a match, so ` ``x` ` is left alone.
 */
export const inputRegex = /(?<!`)`([^`]+)`(?!`)$/;

/** Inline code, rendered as `<code>`. Excludes every other mark. */
export const Code = Mark.create<CodeOptions>({
  name: "code",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  excludes: "_",

  code: true,

  exitable: true,

  parseHTML() {
    return [{ tag: "code" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "code",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setCode:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.setMark(this.name),
      toggleCode:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleMark(this.name),
      unsetCode:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-e": ({ editor }) => editor.commands.toggleCode(),
    };
  },

  addInputRules(): InputRule[] {
    return [markInputRule({ find: inputRegex, type: this.name })];
  },
});
