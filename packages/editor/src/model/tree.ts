/**
 * Immutable structural operations on the document tree. Every function returns
 * a fresh document that shares untouched subtrees by reference, which is what
 * makes snapshot history cheap.
 */

import type { Attributes, JSONContent, MarkJSON } from "../types.js";
import {
  addMarkToSet,
  inlineLength,
  mapInlineMarks,
  normalizeInline,
  removeMarkFromSet,
  sliceInline,
  spliceInline,
} from "./marks.js";
import {
  blockRange,
  childrenOf,
  contentSize,
  endPosition,
  nodeSize,
  resolveInternal,
  startPosition,
} from "./position.js";
import type { Schema } from "./schema.js";

export function nodeAtPath(doc: JSONContent, path: number[]): JSONContent {
  let node = doc;
  for (const index of path) {
    node = childrenOf(node)[index];
  }
  return node;
}

export function replaceAtPath(
  doc: JSONContent,
  path: number[],
  replacement: JSONContent,
): JSONContent {
  if (path.length === 0) {
    return replacement;
  }
  const [index, ...rest] = path;
  const children = childrenOf(doc);
  const next = replaceAtPath(children[index], rest, replacement);
  return {
    ...doc,
    content: [...children.slice(0, index), next, ...children.slice(index + 1)],
  };
}

function pathEquals(left: number[], right: number[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/** Fill in required content so no node violates its content expression. */
export function fillRequired(schema: Schema, node: JSONContent): JSONContent {
  const name = node.type ?? "";
  if (name === "text" || schema.isLeaf(name)) {
    return node;
  }
  const children = childrenOf(node);
  let next = children.map((child) => fillRequired(schema, child));
  if (next.length === 0) {
    next = schema.defaultContent(name);
    if (next.length === 0) {
      return node;
    }
  }
  const changed =
    next.length !== children.length ||
    next.some((child, index) => child !== children[index]);
  return changed ? { ...node, content: next } : node;
}

/** Rebuild every textblock that intersects [from, to). */
export function mapTextblocks(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  transform: (block: JSONContent, contentStart: number) => JSONContent,
): JSONContent {
  return mapTextblocksIn(schema, doc, from, to, 0, transform);
}

function mapTextblocksIn(
  schema: Schema,
  node: JSONContent,
  from: number,
  to: number,
  contentStart: number,
  transform: (block: JSONContent, contentStart: number) => JSONContent,
): JSONContent {
  const children = childrenOf(node);
  const next: JSONContent[] = [];
  let changed = false;
  let position = contentStart;
  for (const child of children) {
    const size = nodeSize(schema, child);
    const end = position + size;
    let result = child;
    const name = child.type ?? "";
    if (
      end > from &&
      position < to &&
      name !== "text" &&
      !schema.isLeaf(name)
    ) {
      result = schema.isTextblock(name)
        ? transform(child, position + 1)
        : mapTextblocksIn(schema, child, from, to, position + 1, transform);
    }
    if (result !== child) {
      changed = true;
    }
    next.push(result);
    position = end;
  }
  return changed ? { ...node, content: next } : node;
}

function stripDisallowedMarks(
  schema: Schema,
  parentName: string,
  node: JSONContent,
): JSONContent {
  if (!node.marks?.length) {
    return node;
  }
  const marks = node.marks.filter((mark) =>
    schema.allowsMark(parentName, mark.type),
  );
  if (marks.length === node.marks.length) {
    return node;
  }
  if (marks.length === 0) {
    const { marks: _dropped, ...rest } = node;
    return rest;
  }
  return { ...node, marks };
}

export function addMarkInRange(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  mark: MarkJSON,
): JSONContent {
  return mapTextblocks(schema, doc, from, to, (block, contentStart) => {
    const name = block.type ?? "";
    if (!schema.allowsMark(name, mark.type)) {
      return block;
    }
    const children = childrenOf(block);
    const localFrom = Math.max(0, from - contentStart);
    const localTo = Math.min(inlineLength(children), to - contentStart);
    if (localFrom >= localTo) {
      return block;
    }
    return {
      ...block,
      content: mapInlineMarks(children, localFrom, localTo, (marks) =>
        addMarkToSet(schema, marks, mark),
      ),
    };
  });
}

export function removeMarkInRange(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  markType: string,
): JSONContent {
  return mapTextblocks(schema, doc, from, to, (block, contentStart) => {
    const children = childrenOf(block);
    const localFrom = Math.max(0, from - contentStart);
    const localTo = Math.min(inlineLength(children), to - contentStart);
    if (localFrom >= localTo) {
      return block;
    }
    return {
      ...block,
      content: mapInlineMarks(children, localFrom, localTo, (marks) =>
        removeMarkFromSet(marks, markType),
      ),
    };
  });
}

export function setBlockTypeInRange(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  type: string,
  attributes?: Attributes,
): JSONContent {
  const defaults = schema.defaultAttributes(type);
  const attrs = { ...defaults };
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (key in defaults) {
      attrs[key] = value;
    }
  }
  return mapTextblocks(schema, doc, from, to, (block) => {
    let content = childrenOf(block);
    if (schema.nodes.get(type)?.marks === "") {
      content = content
        .filter((child) => child.type === "text")
        .map((child) => {
          const { marks: _dropped, ...rest } = child;
          return rest;
        });
    }
    return { type, attrs, content: normalizeInline(content) };
  });
}

export function setNodeAttributesAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  attributes: Attributes,
): JSONContent {
  const $pos = resolveInternal(schema, doc, pos);
  const node = childrenOf($pos.parent)[$pos.index];
  if (!node) {
    return doc;
  }
  const path = [...$pos.pathTo($pos.depth), $pos.index];
  return replaceAtPath(doc, path, {
    ...node,
    attrs: { ...node.attrs, ...attributes },
  });
}

function cutNode(
  schema: Schema,
  node: JSONContent,
  from: number,
  to: number,
  contentStart: number,
): JSONContent {
  const children = childrenOf(node);
  const next: JSONContent[] = [];
  let position = contentStart;
  for (const child of children) {
    const size = nodeSize(schema, child);
    const end = position + size;
    if (end <= from || position >= to) {
      next.push(child);
    } else if (from <= position && end <= to) {
      // fully covered — dropped
    } else if (child.type === "text") {
      const text = child.text ?? "";
      const kept =
        text.slice(0, Math.max(0, from - position)) +
        text.slice(Math.min(size, to - position));
      if (kept) {
        next.push({ ...child, text: kept });
      }
    } else if (schema.isLeaf(child.type ?? "")) {
      next.push(child);
    } else {
      next.push(cutNode(schema, child, from, to, position + 1));
    }
    position = end;
  }
  return { ...node, content: normalizeInline(next) };
}

function mergeNodes(
  left: JSONContent,
  right: JSONContent,
  depth: number,
): JSONContent {
  const leftChildren = childrenOf(left);
  const rightChildren = childrenOf(right);
  if (depth > 0 && leftChildren.length > 0 && rightChildren.length > 0) {
    const last = leftChildren[leftChildren.length - 1];
    const first = rightChildren[0];
    if (last.type !== "text" && first.type !== "text") {
      return {
        ...left,
        content: [
          ...leftChildren.slice(0, -1),
          mergeNodes(last, first, depth - 1),
          ...rightChildren.slice(1),
        ],
      };
    }
  }
  return {
    ...left,
    content: normalizeInline([...leftChildren, ...rightChildren]),
  };
}

export function deleteRangeInDoc(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
): JSONContent {
  if (from >= to) {
    return doc;
  }
  // Emptying the whole document drops the surviving block's type too: what is
  // left is the schema's default textblock, not an empty heading. Callers run
  // fillRequired, which builds it.
  //
  // ponytail: positional test, since we have no NodeSelection to tell "select
  // all" from "select every character". In a single-block document those are
  // the same range, so drag-selecting all of an <h2> and deleting also resets
  // it to a paragraph — tiptap keeps the heading there.
  if (from <= startPosition(schema, doc) && to >= endPosition(schema, doc)) {
    return { ...doc, content: [] };
  }
  const $from = resolveInternal(schema, doc, from);
  const $to = resolveInternal(schema, doc, to);
  const fromPath = $from.pathTo($from.depth);
  const toPath = $to.pathTo($to.depth);

  if ($from.depth === $to.depth && pathEquals(fromPath, toPath)) {
    const parent = $from.parent;
    const children = childrenOf(parent);
    if (schema.isTextblock(parent.type ?? "")) {
      const start = $from.start();
      return replaceAtPath(doc, fromPath, {
        ...parent,
        content: spliceInline(children, from - start, to - start, []),
      });
    }
    return replaceAtPath(doc, fromPath, {
      ...parent,
      content: [
        ...children.slice(0, $from.index),
        ...children.slice($to.index),
      ],
    });
  }

  const cut = cutNode(schema, doc, from, to, 0);

  let shared = 0;
  const maxShared = Math.min($from.depth, $to.depth);
  while (shared < maxShared && $from.indexAt(shared) === $to.indexAt(shared)) {
    shared += 1;
  }
  if ($from.depth <= shared || $to.depth <= shared) {
    return cut;
  }

  const sharedPath = $from.pathTo(shared);
  const parent = nodeAtPath(cut, sharedPath);
  const children = childrenOf(parent);
  const index = $from.indexAt(shared);
  const left = children[index];
  const right = children[index + 1];
  if (!left || !right) {
    return cut;
  }
  const merged = mergeNodes(left, right, maxShared - shared - 1);
  return replaceAtPath(cut, sharedPath, {
    ...parent,
    content: [
      ...children.slice(0, index),
      merged,
      ...children.slice(index + 2),
    ],
  });
}

function toBlocks(schema: Schema, content: JSONContent[]): JSONContent[] {
  const blocks: JSONContent[] = [];
  let pending: JSONContent[] = [];
  const flush = () => {
    if (pending.length === 0) {
      return;
    }
    const type = schema.defaultTypeFor("block") ?? "paragraph";
    blocks.push(schema.createNode(type, undefined, normalizeInline(pending)));
    pending = [];
  };
  for (const node of content) {
    if (schema.isInline(node.type ?? "")) {
      pending.push(node);
    } else {
      flush();
      blocks.push(node);
    }
  }
  flush();
  return blocks;
}

export interface InsertResult {
  doc: JSONContent;
  endPos: number;
}

/**
 * Where the caret goes after `blocks` were inserted starting at `start`.
 *
 * Inside a trailing textblock the caret sits one step back, before its closing
 * token. A leaf block (a horizontal rule) has nothing to sit inside, so that
 * step back would land in the gap between nodes; the caret goes after the node
 * instead and the caller snaps it into the following textblock.
 */
function positionAfterBlocks(
  schema: Schema,
  start: number,
  blocks: JSONContent[],
): number {
  const size = blocks.reduce((sum, block) => sum + nodeSize(schema, block), 0);
  const last = blocks[blocks.length - 1];
  return schema.isLeaf(last?.type ?? "") ? start + size : start + size - 1;
}

export function insertAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  content: JSONContent[],
): InsertResult {
  if (content.length === 0) {
    return { doc, endPos: pos };
  }
  const $pos = resolveInternal(schema, doc, pos);
  const parent = $pos.parent;
  const parentName = parent.type ?? "";
  const parentPath = $pos.pathTo($pos.depth);

  if (
    schema.isTextblock(parentName) &&
    content.every((node) => schema.isInline(node.type ?? ""))
  ) {
    const offset = pos - $pos.start();
    const inserted = normalizeInline(
      content.map((node) => stripDisallowedMarks(schema, parentName, node)),
    );
    return {
      doc: replaceAtPath(doc, parentPath, {
        ...parent,
        content: spliceInline(childrenOf(parent), offset, offset, inserted),
      }),
      endPos: pos + inlineLength(inserted),
    };
  }

  const blocks = toBlocks(schema, content);

  if (schema.isTextblock(parentName)) {
    const children = childrenOf(parent);
    const offset = pos - $pos.start();
    const head = sliceInline(children, 0, offset);
    const tail = sliceInline(children, offset, inlineLength(children));
    const grandPath = parentPath.slice(0, -1);
    const index = parentPath[parentPath.length - 1];
    const grand = nodeAtPath(doc, grandPath);
    const replacement: JSONContent[] = [];
    if (head.length > 0) {
      replacement.push({ ...parent, content: head });
    }
    replacement.push(...blocks);
    if (tail.length > 0) {
      replacement.push({ ...parent, content: tail });
    }
    const grandChildren = childrenOf(grand);
    const blocksStart =
      $pos.before($pos.depth) + (head.length > 0 ? 2 + inlineLength(head) : 0);
    return {
      doc: replaceAtPath(doc, grandPath, {
        ...grand,
        content: [
          ...grandChildren.slice(0, index),
          ...replacement,
          ...grandChildren.slice(index + 1),
        ],
      }),
      endPos: positionAfterBlocks(schema, blocksStart, blocks),
    };
  }

  const children = childrenOf(parent);
  return {
    doc: replaceAtPath(doc, parentPath, {
      ...parent,
      content: [
        ...children.slice(0, $pos.index),
        ...blocks,
        ...children.slice($pos.index),
      ],
    }),
    endPos: positionAfterBlocks(schema, pos, blocks),
  };
}

export function replaceRangeInDoc(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  content: JSONContent[],
): InsertResult {
  if (
    content.length > 0 &&
    content.every((node) => !schema.isInline(node.type ?? ""))
  ) {
    const $from = resolveInternal(schema, doc, from);
    const $to = resolveInternal(schema, doc, to);
    const fromPath = $from.pathTo($from.depth);
    if (
      $from.depth === $to.depth &&
      pathEquals(fromPath, $to.pathTo($to.depth)) &&
      !schema.isTextblock($from.parent.type ?? "")
    ) {
      const parent = $from.parent;
      const children = childrenOf(parent);
      return {
        doc: fillRequired(
          schema,
          replaceAtPath(doc, fromPath, {
            ...parent,
            content: [
              ...children.slice(0, $from.index),
              ...content,
              ...children.slice($to.index),
            ],
          }),
        ),
        endPos: positionAfterBlocks(schema, from, content),
      };
    }
  }

  const deleted = deleteRangeInDoc(schema, doc, from, to);
  if (content.length === 0) {
    return { doc: fillRequired(schema, deleted), endPos: from };
  }
  const inserted = insertAt(schema, deleted, from, content);
  return { doc: fillRequired(schema, inserted.doc), endPos: inserted.endPos };
}

export function wrapRangeInDoc(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  type: string,
  attributes?: Attributes,
): JSONContent | null {
  const range = blockRange(schema, doc, from, to);
  if (!range) {
    return null;
  }
  if (!schema.allowsContent(range.parent.type ?? "", type)) {
    return null;
  }
  const all = childrenOf(range.parent);
  const inside = all.slice(range.startIndex, range.endIndex);
  if (inside.length === 0) {
    return null;
  }
  const chain = schema.findWrapping(
    type,
    inside.map((child) => child.type ?? ""),
  );
  if (!chain) {
    return null;
  }
  const wrapped =
    chain.length === 1
      ? [schema.createNode(chain[0], attributes, inside)]
      : [
          schema.createNode(
            chain[0],
            attributes,
            inside.map((child) =>
              schema.createNode(chain[1], undefined, [child]),
            ),
          ),
        ];
  return replaceAtPath(doc, range.path, {
    ...range.parent,
    content: [
      ...all.slice(0, range.startIndex),
      ...wrapped,
      ...all.slice(range.endIndex),
    ],
  });
}

function liftOnce(
  doc: JSONContent,
  path: number[],
  startIndex: number,
  endIndex: number,
): {
  doc: JSONContent;
  path: number[];
  startIndex: number;
  endIndex: number;
} | null {
  if (path.length === 0) {
    return null;
  }
  const parent = nodeAtPath(doc, path);
  const grandPath = path.slice(0, -1);
  const parentIndex = path[path.length - 1];
  const grand = nodeAtPath(doc, grandPath);
  const children = childrenOf(parent);
  const before = children.slice(0, startIndex);
  const inside = children.slice(startIndex, endIndex);
  const after = children.slice(endIndex);
  const replacement: JSONContent[] = [];
  if (before.length > 0) {
    replacement.push({ ...parent, content: before });
  }
  replacement.push(...inside);
  if (after.length > 0) {
    replacement.push({ ...parent, content: after });
  }
  const grandChildren = childrenOf(grand);
  const nextDoc = replaceAtPath(doc, grandPath, {
    ...grand,
    content: [
      ...grandChildren.slice(0, parentIndex),
      ...replacement,
      ...grandChildren.slice(parentIndex + 1),
    ],
  });
  const newStart = parentIndex + (before.length > 0 ? 1 : 0);
  return {
    doc: nextDoc,
    path: grandPath,
    startIndex: newStart,
    endIndex: newStart + inside.length,
  };
}

export function liftRangeInDoc(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
): JSONContent | null {
  const range = blockRange(schema, doc, from, to);
  if (!range || range.depth === 0) {
    return null;
  }
  const $from = resolveInternal(schema, doc, Math.min(from, to));
  const inside = childrenOf(range.parent).slice(
    range.startIndex,
    range.endIndex,
  );
  if (inside.length === 0) {
    return null;
  }
  const names = inside.map((child) => child.type ?? "");
  let target = -1;
  for (let depth = range.depth - 1; depth >= 0; depth--) {
    const ancestorName = $from.node(depth).type ?? "";
    if (names.every((name) => schema.allowsContent(ancestorName, name))) {
      target = depth;
      break;
    }
  }
  if (target < 0) {
    return null;
  }
  let current: JSONContent = doc;
  let path = range.path;
  let startIndex = range.startIndex;
  let endIndex = range.endIndex;
  for (let depth = range.depth; depth > target; depth--) {
    const result = liftOnce(current, path, startIndex, endIndex);
    if (!result) {
      return null;
    }
    current = result.doc;
    path = result.path;
    startIndex = result.startIndex;
    endIndex = result.endIndex;
  }
  return current;
}

export function splitAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  depth = 1,
): JSONContent | null {
  const $pos = resolveInternal(schema, doc, pos);
  if (!schema.isTextblock($pos.parent.type ?? "")) {
    return null;
  }
  if ($pos.depth - depth < 0) {
    return null;
  }
  const parent = $pos.parent;
  const children = childrenOf(parent);
  const offset = pos - $pos.start();
  let left: JSONContent = {
    ...parent,
    content: sliceInline(children, 0, offset),
  };
  let right: JSONContent = {
    ...parent,
    content: sliceInline(children, offset, inlineLength(children)),
  };
  for (let level = $pos.depth - 1; level > $pos.depth - depth; level--) {
    const ancestor = $pos.node(level);
    const ancestorChildren = childrenOf(ancestor);
    const index = $pos.indexAt(level);
    left = {
      ...ancestor,
      content: [...ancestorChildren.slice(0, index), left],
    };
    right = {
      ...ancestor,
      content: [right, ...ancestorChildren.slice(index + 1)],
    };
  }
  const outerLevel = $pos.depth - depth;
  const outer = $pos.node(outerLevel);
  const outerChildren = childrenOf(outer);
  const outerIndex = $pos.indexAt(outerLevel);
  return replaceAtPath(doc, $pos.pathTo(outerLevel), {
    ...outer,
    content: [
      ...outerChildren.slice(0, outerIndex),
      left,
      right,
      ...outerChildren.slice(outerIndex + 1),
    ],
  });
}

/** Total token size of a document's content — the maximum valid position. */
export function docSize(schema: Schema, doc: JSONContent): number {
  return contentSize(schema, doc);
}
