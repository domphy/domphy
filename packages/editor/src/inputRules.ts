/**
 * Input rules: patterns matched against the text before the cursor when the
 * user types. The rule runs *instead of* inserting the character, so the
 * handler is responsible for whatever text should end up in the document.
 */

import { resolveInternal, textBetween } from "./model/position.js";
import type { Schema } from "./model/schema.js";
import type { EditorInstance, InputRule } from "./types.js";

const LEAF_PLACEHOLDER = "￼";
const MAX_LOOKBEHIND = 500;

export interface RunInputRulesProps {
  editor: EditorInstance;
  rules: InputRule[];
  /** Start of the range the typed text replaces. */
  from: number;
  /** End of that range. */
  to: number;
  /** The text about to be inserted. */
  text: string;
}

/** Returns true when a rule handled the input — the caller must not insert `text`. */
export function runInputRules({
  editor,
  rules,
  from,
  to,
  text,
}: RunInputRulesProps): boolean {
  if (rules.length === 0) {
    return false;
  }
  const schema = editor.schema as Schema;
  const doc = editor.state.doc;
  const $from = resolveInternal(schema, doc, from);
  const parentName = $from.parent.type ?? "";
  if (schema.nodes.get(parentName)?.code) {
    return false;
  }
  if ($from.marks().some((mark) => schema.marks.get(mark.type)?.code)) {
    return false;
  }

  const blockStart = $from.start();
  const lookbehindStart = Math.max(blockStart, from - MAX_LOOKBEHIND);
  const textBefore =
    textBetween(
      schema,
      doc,
      lookbehindStart,
      from,
      "",
      () => LEAF_PLACEHOLDER,
    ) + text;

  for (const rule of rules) {
    if (rule.find.global) {
      rule.find.lastIndex = 0;
    }
    const match = rule.find.exec(textBefore);
    if (!match) {
      continue;
    }
    const matchedDocLength = match[0].length - text.length;
    if (matchedDocLength > from - blockStart) {
      continue;
    }
    const before = editor.state.doc;
    rule.handler({
      editor,
      range: { from: from - matchedDocLength, to },
      match,
      chain: () => editor.chain(),
    });
    if (editor.state.doc !== before) {
      return true;
    }
  }
  return false;
}
