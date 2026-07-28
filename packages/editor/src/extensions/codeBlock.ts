import { Node } from "../Extendable";
import type {
  Attributes,
  CommandProps,
  InputRule,
  JSONContent,
  RawCommands,
} from "../types";
import { textblockTypeInputRule } from "./inputRuleHelpers";
import { mergeAttributes } from "./mergeAttributes";

export interface CodeBlockOptions {
  /** Prefix for the language class placed on the inner `<code>` element. */
  languageClassPrefix: string | null;
  /** Language applied to code blocks that do not declare one. */
  defaultLanguage: string | null;
  /** HTML attributes added to every rendered code block. */
  HTMLAttributes: Attributes;
}

/** Matches a code block typed as ```` ```lang ````. */
export const backtickInputRegex = /^```([a-z]+)?[\s\n]$/;

/** Matches a code block typed as `~~~lang`. */
export const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/;

/** Concatenated text of a textblock whose content is plain text nodes. */
function textblockText(node: JSONContent): string {
  return (node.content ?? []).map((child) => child.text ?? "").join("");
}

/** A block of preformatted code, rendered as `<pre><code>`. */
export const CodeBlock = Node.create<CodeBlockOptions>({
  name: "codeBlock",

  addOptions() {
    return {
      languageClassPrefix: "language-",
      defaultLanguage: null,
      HTMLAttributes: {},
    };
  },

  content: "text*",

  marks: "",

  group: "block",

  code: true,

  defining: true,

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        rendered: false,
        parseHTML: (element) => {
          const { languageClassPrefix } = this.options;

          if (!languageClassPrefix) {
            return null;
          }

          const classNames = Array.from(
            element.firstElementChild?.classList ?? [],
          );
          const language = classNames
            .filter((className) => className.startsWith(languageClassPrefix))
            .map((className) => className.replace(languageClassPrefix, ""))[0];

          return language ?? null;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "pre" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs?.language;

    return [
      "pre",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      [
        "code",
        {
          class: language
            ? `${this.options.languageClassPrefix}${language}`
            : null,
        },
        0,
      ],
    ];
  },

  addCommands(): RawCommands {
    return {
      setCodeBlock:
        (attributes?: { language?: string }) =>
        ({ commands }: CommandProps): boolean =>
          commands.setNode(this.name, attributes),
      toggleCodeBlock:
        (attributes?: { language?: string }) =>
        ({ commands }: CommandProps): boolean =>
          commands.toggleNode(this.name, "paragraph", attributes),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-c": ({ editor }) => editor.commands.toggleCodeBlock(),

      // Backspace unwraps the block when it is empty or starts the document.
      Backspace: ({ editor }) =>
        editor.commands.command(({ tr, commands }) => {
          const { selection } = tr;

          if (!selection.empty) {
            return false;
          }

          const position = tr.resolve(selection.from);

          if (position.parent.type !== this.name) {
            return false;
          }

          if (
            selection.from === 1 ||
            textblockText(position.parent).length === 0
          ) {
            return commands.clearNodes();
          }

          return false;
        }),

      // A third Enter on two trailing newlines leaves the block.
      Enter: ({ editor }) =>
        editor.commands.command(({ tr, chain }) => {
          const { selection } = tr;

          if (!selection.empty) {
            return false;
          }

          const position = tr.resolve(selection.from);

          if (position.parent.type !== this.name) {
            return false;
          }

          const text = textblockText(position.parent);

          if (position.parentOffset !== text.length || !text.endsWith("\n\n")) {
            return false;
          }

          return chain()
            .deleteRange({ from: selection.from - 2, to: selection.from })
            .exitCode()
            .run();
        }),
    };
  },

  addInputRules(): InputRule[] {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.name,
        getAttributes: (match) => ({
          language: match[1] ?? this.options.defaultLanguage,
        }),
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.name,
        getAttributes: (match) => ({
          language: match[1] ?? this.options.defaultLanguage,
        }),
      }),
    ];
  },
});
