/** Plain-text serialization. */

import { contentSize, textBetween } from "../model/position.js";
import type { Schema } from "../model/schema.js";
import type { JSONContent } from "../types.js";

export function getTextBetween(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  blockSeparator = "\n\n",
): string {
  return textBetween(schema, doc, from, to, blockSeparator, (node) => {
    const spec = schema.nodes.get(node.type ?? "");
    return spec?.renderText?.({ node }) ?? "";
  });
}

export function generateText(
  schema: Schema,
  doc: JSONContent,
  blockSeparator = "\n\n",
): string {
  return getTextBetween(
    schema,
    doc,
    0,
    contentSize(schema, doc),
    blockSeparator,
  );
}
