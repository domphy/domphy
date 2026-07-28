import { Node } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  RawCommands,
} from "../types";
import { wrappingInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface OrderedListOptions {
  /** HTML attributes added to every rendered ordered list. */
  HTMLAttributes: Attributes;
}

/** Matches an ordered list typed as `1. `. */
export const inputRegex = /^(\d+)\.\s$/;

/** An ordered list of `listItem` nodes, numbering from the `start` attribute. */
export const OrderedList = Node.create<OrderedListOptions>({
  name: "orderedList",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: "block list",

  content: "listItem+",

  addAttributes() {
    return {
      start: {
        default: 1,
        parseHTML: (element) =>
          element.hasAttribute("start")
            ? Number.parseInt(element.getAttribute("start") ?? "", 10)
            : 1,
      },
    };
  },

  parseHTML() {
    return [{ tag: "ol" }];
  },

  renderHTML({ HTMLAttributes }) {
    const { start, ...rest } = HTMLAttributes;
    const attributes = mergeAttributes(this.options.HTMLAttributes, rest);

    if (start !== undefined && start !== 1) {
      attributes.start = start;
    }

    return ["ol", attributes, 0];
  },

  addCommands(): RawCommands {
    return {
      toggleOrderedList:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleList(this.name, "listItem"),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-7": ({ editor }) => editor.commands.toggleOrderedList(),
    };
  },

  addInputRules(): InputRule[] {
    return [
      wrappingInputRule({
        find: inputRegex,
        type: this.name,
        getAttributes: (match) => ({ start: Number(match[1]) }),
      }),
    ];
  },
});
