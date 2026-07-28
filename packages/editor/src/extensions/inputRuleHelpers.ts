import { nodeSize, resolveInternal } from "../model/position";
import type { Schema } from "../model/schema";
import type { Attributes, InputRule, JSONContent } from "../types";

/**
 * Attributes for the node/mark an input rule produces: a fixed object, or a
 * function of the match. Returning `false`/`null` cancels the rule.
 */
export type AttributesSource =
  | Attributes
  | ((match: RegExpMatchArray) => Attributes | false | null)
  | false
  | null;

function resolveAttributes(
  source: AttributesSource | undefined,
  match: RegExpMatchArray,
): Attributes | null {
  const resolved = typeof source === "function" ? source(match) : source;

  if (resolved === false || resolved === null) {
    return null;
  }

  return resolved ?? {};
}

/**
 * Change the type of the current textblock when the matched text is typed
 * (`# ` → heading). The regex should be anchored with `^`.
 */
export function textblockTypeInputRule(config: {
  find: RegExp;
  type: string;
  getAttributes?: AttributesSource;
}): InputRule {
  return {
    find: config.find,
    handler: ({ range, match, chain }) => {
      const attributes = resolveAttributes(config.getAttributes, match);

      if (!attributes) {
        return;
      }

      chain().deleteRange(range).setNode(config.type, attributes).run();
    },
  };
}

/**
 * Wrap the current textblock when the matched text is typed (`> ` →
 * blockquote, `- ` → bullet list). The regex should be anchored with `^`.
 */
export function wrappingInputRule(config: {
  find: RegExp;
  type: string;
  getAttributes?: AttributesSource;
}): InputRule {
  return {
    find: config.find,
    handler: ({ range, match, chain }) => {
      const attributes = resolveAttributes(config.getAttributes, match);

      if (!attributes) {
        return;
      }

      chain().deleteRange(range).wrapIn(config.type, attributes).run();
    },
  };
}

/**
 * Apply a mark to the last capture group and strip the surrounding
 * delimiters (`**bold**` → bold). The stored mark is cleared afterwards so
 * typing past the closing delimiter is unmarked.
 */
export function markInputRule(config: {
  find: RegExp;
  type: string;
  getAttributes?: AttributesSource;
}): InputRule {
  return {
    find: config.find,
    handler: ({ range, match, chain }) => {
      const attributes = resolveAttributes(config.getAttributes, match);
      const captureGroup = match[match.length - 1];
      const fullMatch = match[0];

      if (!attributes || !captureGroup) {
        return;
      }

      const leadingWhitespace = fullMatch.search(/\S/);
      const markStart = range.from + leadingWhitespace;
      const textStart = range.from + fullMatch.indexOf(captureGroup);
      const textEnd = textStart + captureGroup.length;
      const markEnd = markStart + captureGroup.length;
      const commands = chain();

      if (textEnd < range.to) {
        commands.deleteRange({ from: textEnd, to: range.to });
      }

      if (textStart > markStart) {
        commands.deleteRange({ from: markStart, to: textStart });
      }

      commands
        .setTextSelection({ from: markStart, to: markEnd })
        .setMark(config.type, attributes)
        .setTextSelection(markEnd)
        .command(({ tr }) => {
          tr.setStoredMarks(
            (tr.storedMarks ?? []).filter((mark) => mark.type !== config.type),
          );
          return true;
        })
        .run();
    },
  };
}

/**
 * Replace the matched text with a node (`---` → horizontal rule).
 */
export function nodeInputRule(config: {
  find: RegExp;
  type: string;
  getAttributes?: AttributesSource;
}): InputRule {
  return {
    find: config.find,
    handler: ({ editor, range, match, chain }) => {
      const attributes = resolveAttributes(config.getAttributes, match);

      if (!attributes) {
        return;
      }

      const node: JSONContent =
        Object.keys(attributes).length > 0
          ? { type: config.type, attrs: attributes }
          : { type: config.type };

      const schema = editor.schema as Schema;

      if (schema.isInline(config.type)) {
        chain().deleteRange(range).insertContent(node).run();
        return;
      }

      // A block node goes in *before* the textblock the rule matched in, and
      // the matched text is removed afterwards. Replacing the range outright
      // would drop the emptied textblock with it and strand the caret in the
      // gap after the new node.
      const $from = resolveInternal(schema, editor.state.doc, range.from);
      const shift = nodeSize(schema, node);

      chain()
        .insertContentAt($from.start() - 1, node)
        .deleteRange({ from: range.from + shift, to: range.to + shift })
        .run();
    },
  };
}
