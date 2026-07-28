import { Mark } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { markInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface ItalicOptions {
  /** HTML attributes added to every rendered italic element. */
  HTMLAttributes: Attributes;
}

/** Matches italic text typed as `*italic*`. */
export const starInputRegex = /(?:^|\s)(\*(?!\s+\*)((?:[^*]+))\*(?!\s+\*))$/;

/** Matches italic text typed as `_italic_`. */
export const underscoreInputRegex = /(?:^|\s)(_(?!\s+_)((?:[^_]+))_(?!\s+_))$/;

/** Italic text, rendered as `<em>`. */
export const Italic = Mark.create<ItalicOptions>({
  name: "italic",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "em" },
      {
        tag: "i",
        getAttrs: (element) =>
          element.style.fontStyle !== "normal" ? null : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "em",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setItalic:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.setMark(this.name),
      toggleItalic:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleMark(this.name),
      unsetItalic:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-i": ({ editor }) => editor.commands.toggleItalic(),
      "Mod-I": ({ editor }) => editor.commands.toggleItalic(),
    };
  },

  addInputRules(): InputRule[] {
    return [
      markInputRule({ find: starInputRegex, type: this.name }),
      markInputRule({ find: underscoreInputRegex, type: this.name }),
    ];
  },
});
