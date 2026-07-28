/** Mark set arithmetic and inline-content helpers. */

import type { JSONContent, MarkJSON } from "../types.js";
import type { Schema } from "./schema.js";

export function markEq(left: MarkJSON, right: MarkJSON): boolean {
  if (left.type !== right.type) {
    return false;
  }
  const leftAttributes = left.attrs ?? {};
  const rightAttributes = right.attrs ?? {};
  const keys = new Set([
    ...Object.keys(leftAttributes),
    ...Object.keys(rightAttributes),
  ]);
  for (const key of keys) {
    if (leftAttributes[key] !== rightAttributes[key]) {
      return false;
    }
  }
  return true;
}

export function sameMarks(
  left: MarkJSON[] | undefined,
  right: MarkJSON[] | undefined,
): boolean {
  const a = left ?? [];
  const b = right ?? [];
  return (
    a.length === b.length && a.every((mark, index) => markEq(mark, b[index]))
  );
}

export function hasMark(marks: MarkJSON[] | undefined, type: string): boolean {
  return (marks ?? []).some((mark) => mark.type === type);
}

function sortMarks(schema: Schema, marks: MarkJSON[]): MarkJSON[] {
  return [...marks].sort(
    (left, right) => schema.markRank(left.type) - schema.markRank(right.type),
  );
}

/**
 * Add `mark` to a mark set. Marks excluded by the new mark are dropped; when an
 * existing mark excludes the new one, the set is returned unchanged.
 */
export function addMarkToSet(
  schema: Schema,
  marks: MarkJSON[] | undefined,
  mark: MarkJSON,
): MarkJSON[] {
  const current = marks ?? [];
  if (current.some((existing) => markEq(existing, mark))) {
    return current;
  }
  if (
    current.some(
      (existing) =>
        existing.type !== mark.type &&
        schema.markExcludes(existing.type, mark.type),
    )
  ) {
    return current;
  }
  const kept = current.filter(
    (existing) => !schema.markExcludes(mark.type, existing.type),
  );
  return sortMarks(schema, [...kept, mark]);
}

export function removeMarkFromSet(
  marks: MarkJSON[] | undefined,
  type: string,
): MarkJSON[] {
  return (marks ?? []).filter((mark) => mark.type !== type);
}

/** Drop empty text nodes and merge neighbours that carry identical marks. */
export function normalizeInline(children: JSONContent[]): JSONContent[] {
  const result: JSONContent[] = [];
  for (const child of children) {
    if (child.type === "text") {
      if (!child.text) {
        continue;
      }
      const previous = result[result.length - 1];
      if (previous?.type === "text" && sameMarks(previous.marks, child.marks)) {
        result[result.length - 1] = {
          ...previous,
          text: (previous.text ?? "") + child.text,
        };
        continue;
      }
    }
    result.push(child);
  }
  return result;
}

export function inlineLength(children: JSONContent[]): number {
  let length = 0;
  for (const child of children) {
    length += child.type === "text" ? (child.text?.length ?? 0) : 1;
  }
  return length;
}

/** Slice inline children by character offsets. */
export function sliceInline(
  children: JSONContent[],
  from: number,
  to: number,
): JSONContent[] {
  const result: JSONContent[] = [];
  let position = 0;
  for (const child of children) {
    const size = child.type === "text" ? (child.text?.length ?? 0) : 1;
    const end = position + size;
    if (end > from && position < to) {
      if (child.type === "text") {
        const text = (child.text ?? "").slice(
          Math.max(0, from - position),
          Math.min(size, to - position),
        );
        if (text) {
          result.push({ ...child, text });
        }
      } else {
        result.push(child);
      }
    }
    position = end;
  }
  return normalizeInline(result);
}

/** Replace inline children in [from, to) with `insert`. */
export function spliceInline(
  children: JSONContent[],
  from: number,
  to: number,
  insert: JSONContent[],
): JSONContent[] {
  const total = inlineLength(children);
  return normalizeInline([
    ...sliceInline(children, 0, from),
    ...insert,
    ...sliceInline(children, to, total),
  ]);
}

/** Apply `transform` to the mark sets of every text node inside [from, to). */
export function mapInlineMarks(
  children: JSONContent[],
  from: number,
  to: number,
  transform: (marks: MarkJSON[] | undefined) => MarkJSON[],
): JSONContent[] {
  const result: JSONContent[] = [];
  let position = 0;
  for (const child of children) {
    const size = child.type === "text" ? (child.text?.length ?? 0) : 1;
    const end = position + size;
    if (end <= from || position >= to || from === to) {
      result.push(child);
      position = end;
      continue;
    }
    if (child.type !== "text") {
      result.push({ ...child, marks: transform(child.marks) });
      position = end;
      continue;
    }
    const text = child.text ?? "";
    const start = Math.max(0, from - position);
    const stop = Math.min(size, to - position);
    if (start > 0) {
      result.push({ ...child, text: text.slice(0, start) });
    }
    result.push({
      ...child,
      text: text.slice(start, stop),
      marks: transform(child.marks),
    });
    if (stop < size) {
      result.push({ ...child, text: text.slice(stop) });
    }
    position = end;
  }
  return normalizeInline(
    result.map((node) =>
      node.marks?.length === 0 ? stripEmptyMarks(node) : node,
    ),
  );
}

function stripEmptyMarks(node: JSONContent): JSONContent {
  const { marks: _marks, ...rest } = node;
  return rest;
}
