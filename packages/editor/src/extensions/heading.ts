import { Node } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  EditorInstance,
  InputRule,
  RawCommands,
} from "../types";
import { textblockTypeInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingOptions {
  /** Heading levels the editor accepts. */
  levels: Level[];
  /** HTML attributes added to every rendered heading. */
  HTMLAttributes: Attributes;
}

/** Headings `h1` to `h6`, level stored as an attribute. */
export const Heading = Node.create<HeadingOptions>({
  name: "heading",

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {},
    };
  },

  content: "inline*",

  group: "block",

  defining: true,

  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
      },
    };
  },

  parseHTML() {
    return this.options.levels.map((level) => ({
      tag: `h${level}`,
      attrs: { level },
    }));
  },

  renderHTML({ node, HTMLAttributes }) {
    const attributeLevel = node.attrs?.level as Level;
    const level = this.options.levels.includes(attributeLevel)
      ? attributeLevel
      : this.options.levels[0];

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setHeading:
        (attributes: { level: Level }) =>
        ({ commands }: CommandProps): boolean => {
          if (!this.options.levels.includes(attributes.level)) {
            return false;
          }

          return commands.setNode(this.name, attributes);
        },
      toggleHeading:
        (attributes: { level: Level }) =>
        ({ commands }: CommandProps): boolean => {
          if (!this.options.levels.includes(attributes.level)) {
            return false;
          }

          return commands.toggleNode(this.name, "paragraph", attributes);
        },
    };
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<
      string,
      (props: { editor: EditorInstance }) => boolean
    > = {};

    for (const level of this.options.levels) {
      shortcuts[`Mod-Alt-${level}`] = ({ editor }) =>
        editor.commands.toggleHeading({ level });
    }

    return shortcuts;
  },

  addInputRules(): InputRule[] {
    const maxLevel = Math.max(...this.options.levels);

    return [
      textblockTypeInputRule({
        find: new RegExp(`^(#{1,${maxLevel}})\\s$`),
        type: this.name,
        getAttributes: (match) => {
          const level = match[1].length as Level;

          return this.options.levels.includes(level) ? { level } : false;
        },
      }),
    ];
  },
});
