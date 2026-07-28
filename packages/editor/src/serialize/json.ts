/**
 * JSON in/out. `hydrate*` builds the internal document (attribute defaults
 * filled in, unknown content coerced away); `toJSON` produces the public shape
 * described in the contract: no attrs when everything is default, no empty
 * content arrays, marks only on text nodes.
 */

import { normalizeInline } from "../model/marks.js";
import { childrenOf } from "../model/position.js";
import type { Schema } from "../model/schema.js";
import { fillRequired } from "../model/tree.js";
import type { Attributes, Content, JSONContent, MarkJSON } from "../types.js";

function flattenInline(schema: Schema, node: JSONContent): JSONContent[] {
  if (node.type === "text" || schema.isInline(node.type ?? "")) {
    return [node];
  }
  return childrenOf(node).flatMap((child) => flattenInline(schema, child));
}

function hydrateNode(
  schema: Schema,
  node: JSONContent,
  parentName: string,
): JSONContent | null {
  if (node.type === "text" || (!node.type && node.text !== undefined)) {
    if (!node.text) {
      return null;
    }
    const marks = (node.marks ?? [])
      .filter(
        (mark) =>
          schema.isMark(mark.type) && schema.allowsMark(parentName, mark.type),
      )
      .map((mark) => schema.createMark(mark.type, mark.attrs));
    const text: JSONContent = { type: "text", text: node.text };
    if (marks.length > 0) {
      text.marks = marks;
    }
    return text;
  }
  const name = node.type ?? "";
  if (!schema.isNode(name)) {
    return null;
  }
  const attrs = { ...schema.defaultAttributes(name), ...node.attrs };
  if (schema.isLeaf(name)) {
    return { type: name, attrs };
  }
  return {
    type: name,
    attrs,
    content: hydrateContent(schema, node.content ?? [], name),
  };
}

export function hydrateContent(
  schema: Schema,
  nodes: JSONContent[],
  parentName: string,
): JSONContent[] {
  const intoTextblock = schema.isTextblock(parentName);
  const result: JSONContent[] = [];
  let pending: JSONContent[] = [];

  const flushPending = () => {
    if (pending.length === 0) {
      return;
    }
    const type = schema.defaultTypeFor("block") ?? "paragraph";
    if (schema.allowsContent(parentName, type)) {
      result.push({
        type,
        attrs: schema.defaultAttributes(type),
        content: normalizeInline(pending),
      });
    }
    pending = [];
  };

  for (const raw of nodes) {
    const node = hydrateNode(schema, raw, parentName);
    if (!node) {
      continue;
    }
    const name = node.type ?? "";
    if (intoTextblock) {
      result.push(...flattenInline(schema, node));
      continue;
    }
    if (schema.isInline(name)) {
      pending.push(node);
      continue;
    }
    flushPending();
    if (schema.allowsContent(parentName, name)) {
      result.push(node);
      continue;
    }
    // Not allowed here — keep whatever of its content fits instead of dropping everything.
    result.push(
      ...childrenOf(node).filter((child) =>
        schema.allowsContent(parentName, child.type ?? ""),
      ),
    );
  }
  flushPending();
  return intoTextblock ? normalizeInline(result) : result;
}

/** Build a complete document from JSON content. */
export function fromJSON(
  schema: Schema,
  content: JSONContent | JSONContent[] | null,
): JSONContent {
  const top = schema.topNodeType;
  if (!content) {
    return fillRequired(schema, schema.createNode(top));
  }
  const nodes = Array.isArray(content)
    ? content
    : content.type === top
      ? (content.content ?? [])
      : [content];
  const doc: JSONContent = {
    type: top,
    attrs: schema.defaultAttributes(top),
    content: hydrateContent(schema, nodes, top),
  };
  return fillRequired(schema, doc);
}

function pruneAttributes(
  schema: Schema,
  name: string,
  attrs: Attributes | undefined,
): Attributes | undefined {
  if (!attrs) {
    return undefined;
  }
  const defaults = schema.defaultAttributes(name);
  const result: Attributes = {};
  let count = 0;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === defaults[key]) {
      continue;
    }
    result[key] = value;
    count += 1;
  }
  return count > 0 ? result : undefined;
}

function markToJSON(schema: Schema, mark: MarkJSON): MarkJSON {
  const result: MarkJSON = { type: mark.type };
  const attrs = pruneAttributes(schema, mark.type, mark.attrs);
  if (attrs) {
    result.attrs = attrs;
  }
  return result;
}

export function toJSON(schema: Schema, node: JSONContent): JSONContent {
  const name = node.type ?? "";
  if (name === "text") {
    const text: JSONContent = { type: "text", text: node.text ?? "" };
    if (node.marks?.length) {
      text.marks = node.marks.map((mark) => markToJSON(schema, mark));
    }
    return text;
  }
  const result: JSONContent = { type: name };
  const attrs = pruneAttributes(schema, name, node.attrs);
  if (attrs) {
    result.attrs = attrs;
  }
  const content = childrenOf(node).map((child) => toJSON(schema, child));
  if (content.length > 0) {
    result.content = content;
  }
  return result;
}

/** Coerce a `Content` value (JSON only — HTML strings go through parseHTML). */
export function createDocument(
  schema: Schema,
  content: Content,
  parse: (html: string) => JSONContent,
): JSONContent {
  if (typeof content === "string") {
    return parse(content);
  }
  return fromJSON(schema, content ?? null);
}
