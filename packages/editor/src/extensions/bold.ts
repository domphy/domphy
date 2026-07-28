import { Mark } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { markInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface BoldOptions {
  /** HTML attributes added to every rendered bold element. */
  HTMLAttributes: Attributes;
}

/** Matches bold text typed as `**bold**`. */
export const starInputRegex =
  /(?:^|\s)(\*\*(?!\s+\*\*)((?:[^*]+))\*\*(?!\s+\*\*))$/;

/** Matches bold text typed as `__bold__`. */
export const underscoreInputRegex =
  /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;

/** Bold text, rendered as `<strong>`. */
export const Bold = Mark.create<BoldOptions>({
  name: "bold",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      { tag: "strong" },
      {
        tag: "b",
        getAttrs: (element) =>
          element.style.fontWeight !== "normal" ? null : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "strong",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setBold:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.setMark(this.name),
      toggleBold:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleMark(this.name),
      unsetBold:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.unsetMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-b": ({ editor }) => editor.commands.toggleBold(),
      "Mod-B": ({ editor }) => editor.commands.toggleBold(),
    };
  },

  addInputRules(): InputRule[] {
    return [
      markInputRule({ find: starInputRegex, type: this.name }),
      markInputRule({ find: underscoreInputRegex, type: this.name }),
    ];
  },
});
