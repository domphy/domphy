import { Node } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { nodeInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface HorizontalRuleOptions {
  /** HTML attributes added to every rendered rule. */
  HTMLAttributes: Attributes;
}

/** Matches a horizontal rule typed as `---`, `___ ` or `*** `. */
export const inputRegex = /^(?:---|—-|___\s|\*\*\*\s)$/;

/** A thematic break, rendered as `<hr>`. */
export const HorizontalRule = Node.create<HorizontalRuleOptions>({
  name: "horizontalRule",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "block",

  parseHTML() {
    return [{ tag: "hr" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["hr", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands(): RawCommands {
    return {
      setHorizontalRule:
        () =>
        ({ chain }: CommandProps): boolean =>
          chain().insertContent({ type: this.name }).scrollIntoView().run(),
    };
  },

  addInputRules(): InputRule[] {
    return [nodeInputRule({ find: inputRegex, type: this.name })];
  },
});
