/**
 * ProseMirror-style token positions over the plain JSON document tree.
 *
 * Entering a non-leaf node costs 1, each text character costs 1, a leaf node
 * costs 1, leaving a node costs 1. Doc start is 0.
 */

import type { JSONContent, MarkJSON, ResolvedPosition } from "../types.js";
import { markEq } from "./marks.js";
import type { Schema } from "./schema.js";

const sizeCache = new WeakMap<JSONContent, number>();

export function nodeSize(schema: Schema, node: JSONContent): number {
  if (node.type === "text") {
    return node.text?.length ?? 0;
  }
  const cached = sizeCache.get(node);
  if (cached !== undefined) {
    return cached;
  }
  const size = schema.isLeaf(node.type ?? "")
    ? 1
    : 2 + contentSize(schema, node);
  sizeCache.set(node, size);
  return size;
}

export function contentSize(schema: Schema, node: JSONContent): number {
  let size = 0;
  for (const child of node.content ?? []) {
    size += nodeSize(schema, child);
  }
  return size;
}

export function childrenOf(node: JSONContent): JSONContent[] {
  return node.content ?? [];
}

/**
 * Index of the child at `offset` inside `node`'s content. When `offset` falls
 * exactly on a child boundary, the index after that child is returned.
 */
export function findIndex(
  schema: Schema,
  node: JSONContent,
  offset: number,
): { index: number; offset: number } {
  const children = childrenOf(node);
  if (offset <= 0) {
    return { index: 0, offset: 0 };
  }
  let position = 0;
  for (let i = 0; i < children.length; i++) {
    const end = position + nodeSize(schema, children[i]);
    if (end >= offset) {
      return end === offset
        ? { index: i + 1, offset: end }
        : { index: i, offset: position };
    }
    position = end;
  }
  return { index: children.length, offset: position };
}

class ResolvedPositionImplementation implements ResolvedPosition {
  constructor(
    readonly pos: number,
    private readonly schema: Schema,
    private readonly ancestors: JSONContent[],
    private readonly indexes: number[],
    private readonly boundaries: number[],
    readonly parentOffset: number,
  ) {}

  get parent(): JSONContent {
    return this.ancestors[this.ancestors.length - 1];
  }

  get depth(): number {
    return this.ancestors.length - 1;
  }

  get index(): number {
    return this.indexes[this.indexes.length - 1];
  }

  get path(): number[] {
    return this.indexes.slice(0, -1);
  }

  node(depth: number): JSONContent {
    return this.ancestors[depth];
  }

  /** Child index chosen at `depth` while resolving. */
  indexAt(depth: number): number {
    return this.indexes[depth];
  }

  indexAfter(depth: number): number {
    return (
      this.indexes[depth] +
      (depth === this.depth && this.textOffset === 0 ? 0 : 1)
    );
  }

  /** Path of child indexes from the doc root down to the node at `depth`. */
  pathTo(depth: number): number[] {
    return this.indexes.slice(0, depth);
  }

  get textOffset(): number {
    return this.pos - this.boundaries[this.depth];
  }

  start(depth: number = this.depth): number {
    return depth === 0 ? 0 : this.boundaries[depth - 1] + 1;
  }

  end(depth: number = this.depth): number {
    return this.start(depth) + contentSize(this.schema, this.ancestors[depth]);
  }

  /** Position directly before the node at `depth`. */
  before(depth: number): number {
    return this.boundaries[depth - 1];
  }

  /** Position directly after the node at `depth`. */
  after(depth: number): number {
    return (
      this.boundaries[depth - 1] + nodeSize(this.schema, this.ancestors[depth])
    );
  }

  marks(): MarkJSON[] {
    const children = childrenOf(this.parent);
    if (children.length === 0) {
      return [];
    }
    if (this.textOffset > 0) {
      return children[this.index]?.marks ?? [];
    }
    let main = children[this.index - 1];
    let other = children[this.index];
    if (!main) {
      main = other;
      other = children[this.index - 1];
    }
    if (!main) {
      return [];
    }
    return (main.marks ?? []).filter((mark) => {
      if (this.schema.marks.get(mark.type)?.inclusive !== false) {
        return true;
      }
      return (
        !!other &&
        (other.marks ?? []).some((candidate) => markEq(candidate, mark))
      );
    });
  }
}

export function resolve(
  schema: Schema,
  doc: JSONContent,
  pos: number,
): ResolvedPosition {
  const clamped = Math.max(0, Math.min(pos, contentSize(schema, doc)));
  const ancestors: JSONContent[] = [];
  const indexes: number[] = [];
  const boundaries: number[] = [];
  let node = doc;
  let start = 0;
  let parentOffset = clamped;
  for (;;) {
    const { index, offset } = findIndex(schema, node, parentOffset);
    const remainder = parentOffset - offset;
    ancestors.push(node);
    indexes.push(index);
    boundaries.push(start + offset);
    if (remainder === 0) {
      break;
    }
    const child = childrenOf(node)[index];
    if (!child || child.type === "text") {
      break;
    }
    node = child;
    parentOffset = remainder - 1;
    start += offset + 1;
  }
  return new ResolvedPositionImplementation(
    clamped,
    schema,
    ancestors,
    indexes,
    boundaries,
    parentOffset,
  );
}

export type ResolvedPositionInternal = ResolvedPosition & {
  indexAt(depth: number): number;
  indexAfter(depth: number): number;
  pathTo(depth: number): number[];
  before(depth: number): number;
  after(depth: number): number;
  textOffset: number;
};

export function resolveInternal(
  schema: Schema,
  doc: JSONContent,
  pos: number,
): ResolvedPositionInternal {
  return resolve(schema, doc, pos) as ResolvedPositionInternal;
}

/** Return `false` from a visitor to skip descending into that node. */
export type NodeVisitor = (
  node: JSONContent,
  pos: number,
  parent: JSONContent,
  index: number,
) => unknown;

export function nodesBetween(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  visit: NodeVisitor,
): void {
  walk(schema, doc, from, to, visit, 0);
}

function walk(
  schema: Schema,
  node: JSONContent,
  from: number,
  to: number,
  visit: NodeVisitor,
  nodeStart: number,
): void {
  const children = childrenOf(node);
  let position = 0;
  for (let i = 0; i < children.length && position < to; i++) {
    const child = children[i];
    const end = position + nodeSize(schema, child);
    if (end > from) {
      const descend = visit(child, nodeStart + position, node, i);
      if (
        descend !== false &&
        child.type !== "text" &&
        childrenOf(child).length > 0
      ) {
        const start = position + 1;
        walk(
          schema,
          child,
          Math.max(0, from - start),
          Math.min(contentSize(schema, child), to - start),
          visit,
          nodeStart + start,
        );
      }
    }
    position = end;
  }
}

export function textBetween(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  blockSeparator = "",
  leafText: (node: JSONContent) => string = () => "",
): string {
  let text = "";
  let first = true;
  nodesBetween(schema, doc, from, to, (node, pos) => {
    const type = node.type ?? "";
    let nodeText = "";
    if (type === "text") {
      nodeText = (node.text ?? "").slice(Math.max(from, pos) - pos, to - pos);
    } else if (schema.isLeaf(type)) {
      nodeText = leafText(node);
    }
    const isBlock = !schema.isInline(type);
    if (
      blockSeparator &&
      isBlock &&
      ((schema.isLeaf(type) && nodeText) || schema.isTextblock(type))
    ) {
      if (first) {
        first = false;
      } else {
        text += blockSeparator;
      }
    }
    text += nodeText;
  });
  return text;
}

/** The node starting exactly at `pos`, or null. */
export function nodeAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
): JSONContent | null {
  let node: JSONContent = doc;
  let offset = pos;
  for (;;) {
    const { index, offset: childOffset } = findIndex(schema, node, offset);
    const child = childrenOf(node)[index];
    if (!child) {
      return null;
    }
    if (childOffset === offset || child.type === "text") {
      return child;
    }
    node = child;
    offset -= childOffset + 1;
  }
}

export interface BlockRange {
  depth: number;
  parent: JSONContent;
  path: number[];
  startIndex: number;
  endIndex: number;
}

/** The sibling block range covering [from, to], mirroring `$from.blockRange($to)`. */
export function blockRange(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
): BlockRange | null {
  const $from = resolveInternal(schema, doc, Math.min(from, to));
  const $to = resolveInternal(schema, doc, Math.max(from, to));
  const inlineParent = schema.isTextblock($from.parent.type ?? "");
  for (
    let depth = $from.depth - (inlineParent || $from.pos === $to.pos ? 1 : 0);
    depth >= 0;
    depth--
  ) {
    if ($to.pos <= $from.end(depth)) {
      return {
        depth,
        parent: $from.node(depth),
        path: $from.pathTo(depth),
        startIndex: $from.indexAt(depth),
        endIndex: $to.indexAfter(depth),
      };
    }
  }
  return null;
}

/** First position inside a textblock, or 0 when the doc has none. */
export function startPosition(schema: Schema, doc: JSONContent): number {
  let found: number | null = null;
  nodesBetween(schema, doc, 0, contentSize(schema, doc), (node, pos) => {
    if (found !== null) {
      return false;
    }
    if (schema.isTextblock(node.type ?? "")) {
      found = pos + 1;
      return false;
    }
    return undefined;
  });
  return found ?? 0;
}

/** Last position inside a textblock, or the doc end when the doc has none. */
export function endPosition(schema: Schema, doc: JSONContent): number {
  let found: number | null = null;
  nodesBetween(schema, doc, 0, contentSize(schema, doc), (node, pos) => {
    if (schema.isTextblock(node.type ?? "")) {
      found = pos + 1 + contentSize(schema, node);
    }
    return undefined;
  });
  return found ?? contentSize(schema, doc);
}

/** Every textblock's content range, in document order. */
export function textblockRanges(
  schema: Schema,
  doc: JSONContent,
): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  nodesBetween(schema, doc, 0, contentSize(schema, doc), (node, pos) => {
    if (!schema.isTextblock(node.type ?? "")) {
      return undefined;
    }
    const from = pos + 1;
    ranges.push({ from, to: from + contentSize(schema, node) });
    return false;
  });
  return ranges;
}

/**
 * A position expressed as an offset inside the n-th textblock.
 *
 * `index` is -1 when `pos` sits outside every textblock (next to a horizontal
 * rule, say), in which case `offset` is the raw position.
 */
export interface TextblockPoint {
  index: number;
  offset: number;
}

/**
 * Locate `pos` relative to the textblock that contains it.
 *
 * Wrap and lift renest blocks but never reorder, add or drop textblocks, so
 * this survives them where a plain character count does not: a caret in an
 * empty block has the same character count as the end of the preceding block
 * and would otherwise be restored into that preceding block.
 */
export function textblockPointAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
): TextblockPoint {
  const ranges = textblockRanges(schema, doc);
  for (let index = 0; index < ranges.length; index++) {
    if (pos >= ranges[index].from && pos <= ranges[index].to) {
      return { index, offset: pos - ranges[index].from };
    }
  }
  return { index: -1, offset: pos };
}

/** Resolve a {@link TextblockPoint} back into a position in `doc`. */
export function positionAtTextblockPoint(
  schema: Schema,
  doc: JSONContent,
  point: TextblockPoint,
): number {
  if (point.index < 0) {
    return nearestTextPosition(schema, doc, point.offset);
  }
  const range = textblockRanges(schema, doc)[point.index];
  return range
    ? Math.min(range.from + point.offset, range.to)
    : endPosition(schema, doc);
}

/** Snap `pos` onto the closest position that sits inside a textblock. */
export function nearestTextPosition(
  schema: Schema,
  doc: JSONContent,
  pos: number,
): number {
  const size = contentSize(schema, doc);
  const target = Math.max(0, Math.min(pos, size));
  const $target = resolveInternal(schema, doc, target);
  if (schema.isTextblock($target.parent.type ?? "")) {
    return target;
  }
  let best: number | null = null;
  nodesBetween(schema, doc, 0, size, (node, nodePos) => {
    if (!schema.isTextblock(node.type ?? "")) {
      return undefined;
    }
    const start = nodePos + 1;
    const end = start + contentSize(schema, node);
    const candidate = Math.max(start, Math.min(target, end));
    if (
      best === null ||
      Math.abs(candidate - target) < Math.abs(best - target)
    ) {
      best = candidate;
    }
    return false;
  });
  return best ?? target;
}
