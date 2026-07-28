/**
 * `isActive` and friends, matching tiptap's coverage semantics:
 * a mark/node counts as active over a range only when it covers the whole
 * selection; attribute matching is a subset test.
 */

import {
  childrenOf,
  nodeSize,
  nodesBetween,
  resolveInternal,
} from "./model/position.js";
import type { Schema } from "./model/schema.js";
import type {
  Attributes,
  EditorStateLike,
  JSONContent,
  MarkJSON,
} from "./types.js";
import { objectIncludes } from "./utils.js";

export function isMarkActive(
  schema: Schema,
  state: EditorStateLike,
  markType: string | null,
  attributes: Attributes = {},
): boolean {
  const { empty, from, to } = state.selection;

  if (empty) {
    const $from = resolveInternal(schema, state.doc, from);
    return (state.storedMarks ?? $from.marks())
      .filter((mark) => !markType || mark.type === markType)
      .some((mark) => objectIncludes(mark.attrs ?? {}, attributes));
  }

  let selectionRange = 0;
  const markRanges: { mark: MarkJSON; from: number; to: number }[] = [];

  nodesBetween(schema, state.doc, from, to, (node, pos) => {
    const name = node.type ?? "";
    if (
      markType &&
      schema.isTextblock(name) &&
      !schema.allowsMark(name, markType)
    ) {
      return false;
    }
    if (name !== "text" && !node.marks?.length) {
      return undefined;
    }
    const relativeFrom = Math.max(from, pos);
    const relativeTo = Math.min(to, pos + nodeSize(schema, node));
    selectionRange += relativeTo - relativeFrom;
    for (const mark of node.marks ?? []) {
      markRanges.push({ mark, from: relativeFrom, to: relativeTo });
    }
    return undefined;
  });

  if (selectionRange === 0) {
    return false;
  }

  const matchedRange = markRanges
    .filter((entry) => !markType || entry.mark.type === markType)
    .filter((entry) => objectIncludes(entry.mark.attrs ?? {}, attributes))
    .reduce((sum, entry) => sum + entry.to - entry.from, 0);

  const excludedRange = markRanges
    .filter(
      (entry) =>
        !!markType &&
        entry.mark.type !== markType &&
        schema.markExcludes(entry.mark.type, markType),
    )
    .reduce((sum, entry) => sum + entry.to - entry.from, 0);

  const covered =
    matchedRange > 0 ? matchedRange + excludedRange : matchedRange;
  return covered >= selectionRange;
}

export function isNodeActive(
  schema: Schema,
  state: EditorStateLike,
  nodeType: string | null,
  attributes: Attributes = {},
): boolean {
  const { empty, from, to } = state.selection;
  const matched: { from: number; to: number }[] = [];

  nodesBetween(schema, state.doc, from, to, (node, pos) => {
    const name = node.type ?? "";
    if (name === "text") {
      return undefined;
    }
    if (nodeType && name !== nodeType) {
      return undefined;
    }
    if (!objectIncludes(node.attrs ?? {}, attributes)) {
      return undefined;
    }
    matched.push({
      from: Math.max(from, pos),
      to: Math.min(to, pos + nodeSize(schema, node)),
    });
    return undefined;
  });

  if (empty) {
    return matched.length > 0;
  }
  const covered = matched.reduce(
    (sum, range) => sum + range.to - range.from,
    0,
  );
  return covered >= to - from;
}

export function isActive(
  schema: Schema,
  state: EditorStateLike,
  name: string | null,
  attributes: Attributes = {},
): boolean {
  if (!name) {
    return (
      isNodeActive(schema, state, null, attributes) ||
      isMarkActive(schema, state, null, attributes)
    );
  }
  if (schema.isNode(name)) {
    return isNodeActive(schema, state, name, attributes);
  }
  if (schema.isMark(name)) {
    return isMarkActive(schema, state, name, attributes);
  }
  return false;
}

export function getMarkAttributes(
  schema: Schema,
  state: EditorStateLike,
  markType: string,
): Attributes {
  const { empty, from, to } = state.selection;
  const marks: MarkJSON[] = [];
  if (empty) {
    if (state.storedMarks) {
      marks.push(...state.storedMarks);
    }
    marks.push(...resolveInternal(schema, state.doc, from).marks());
  } else {
    nodesBetween(schema, state.doc, from, to, (node) => {
      marks.push(...(node.marks ?? []));
      return undefined;
    });
  }
  const mark = marks.find((candidate) => candidate.type === markType);
  return { ...(mark?.attrs ?? {}) };
}

export function getNodeAttributes(
  schema: Schema,
  state: EditorStateLike,
  nodeType: string,
): Attributes {
  const { from, to } = state.selection;
  let found: JSONContent | null = null;
  nodesBetween(schema, state.doc, from, to, (node) => {
    if (!found && node.type === nodeType) {
      found = node;
    }
    return undefined;
  });
  if (found) {
    return { ...((found as JSONContent).attrs ?? {}) };
  }
  const parent = findParentNode(
    schema,
    state.doc,
    from,
    (node) => node.type === nodeType,
  );
  return { ...(parent?.node.attrs ?? {}) };
}

export interface ParentNodeMatch {
  node: JSONContent;
  pos: number;
  depth: number;
  path: number[];
}

export function findParentNode(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  predicate: (node: JSONContent) => boolean,
): ParentNodeMatch | null {
  const $pos = resolveInternal(schema, doc, pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (predicate(node)) {
      return { node, pos: $pos.before(depth), depth, path: $pos.pathTo(depth) };
    }
  }
  return null;
}

/** Extent of the run of `markType` around `pos` inside its textblock. */
export function getMarkRange(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  markType: string,
  attributes?: Attributes,
): { from: number; to: number } | null {
  const $pos = resolveInternal(schema, doc, pos);
  const parent = $pos.parent;
  if (!schema.isTextblock(parent.type ?? "")) {
    return null;
  }
  const spans: { marks: MarkJSON[]; from: number; to: number }[] = [];
  let offset = $pos.start();
  for (const child of childrenOf(parent)) {
    const size = child.type === "text" ? (child.text?.length ?? 0) : 1;
    spans.push({ marks: child.marks ?? [], from: offset, to: offset + size });
    offset += size;
  }
  const carries = (index: number) =>
    index >= 0 &&
    index < spans.length &&
    spans[index].marks.some(
      (mark) =>
        mark.type === markType &&
        (!attributes || objectIncludes(mark.attrs ?? {}, attributes)),
    );

  let index = spans.findIndex((span) => span.from <= pos && pos < span.to);
  if (!carries(index)) {
    index = spans.findIndex((span) => span.to === pos);
  }
  if (!carries(index)) {
    return null;
  }
  let startIndex = index;
  let endIndex = index;
  while (carries(startIndex - 1)) {
    startIndex -= 1;
  }
  while (carries(endIndex + 1)) {
    endIndex += 1;
  }
  return { from: spans[startIndex].from, to: spans[endIndex].to };
}
