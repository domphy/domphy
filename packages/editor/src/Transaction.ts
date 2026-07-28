/**
 * A mutable draft of the next editor state. Commands mutate the transaction;
 * the editor applies it once — one history entry, one render.
 */

import { addMarkToSet, normalizeInline } from "./model/marks.js";
import {
  blockRange,
  contentSize,
  nearestTextPosition,
  positionAtTextIndex,
  resolve,
  resolveInternal,
  textIndexAt,
} from "./model/position.js";
import type { Schema } from "./model/schema.js";
import {
  addMarkInRange,
  deleteRangeInDoc,
  fillRequired,
  liftRangeInDoc,
  removeMarkInRange,
  replaceRangeInDoc,
  setBlockTypeInRange,
  setNodeAttributesAt,
  splitAt,
  wrapRangeInDoc,
} from "./model/tree.js";
import type {
  Attributes,
  JSONContent,
  MarkJSON,
  ResolvedPosition,
  SelectionRange,
  Transaction,
} from "./types.js";

export function createSelection(anchor: number, head: number): SelectionRange {
  return {
    anchor,
    head,
    from: Math.min(anchor, head),
    to: Math.max(anchor, head),
    empty: anchor === head,
  };
}

export class EditorTransaction implements Transaction {
  doc: JSONContent;
  selection: SelectionRange;
  storedMarks: MarkJSON[] | null;
  docChanged = false;

  private readonly metadata = new Map<string, unknown>();

  constructor(
    private readonly schema: Schema,
    doc: JSONContent,
    selection: SelectionRange,
    storedMarks: MarkJSON[] | null,
  ) {
    this.doc = doc;
    this.selection = selection;
    this.storedMarks = storedMarks;
  }

  private applyDoc(doc: JSONContent): void {
    if (doc === this.doc) {
      return;
    }
    this.doc = doc;
    this.docChanged = true;
    const size = contentSize(this.schema, doc);
    if (this.selection.anchor > size || this.selection.head > size) {
      this.selection = createSelection(
        Math.min(this.selection.anchor, size),
        Math.min(this.selection.head, size),
      );
    }
  }

  setSelection(anchor: number, head: number = anchor): Transaction {
    const snappedAnchor = nearestTextPosition(this.schema, this.doc, anchor);
    const snappedHead = nearestTextPosition(this.schema, this.doc, head);
    this.selection = createSelection(snappedAnchor, snappedHead);
    this.storedMarks = null;
    return this;
  }

  replaceRange(from: number, to: number, content: JSONContent[]): Transaction {
    const result = replaceRangeInDoc(this.schema, this.doc, from, to, content);
    this.applyDoc(result.doc);
    this.setSelection(result.endPos);
    return this;
  }

  insertText(
    text: string,
    from: number = this.selection.from,
    to: number = this.selection.to,
  ): Transaction {
    if (!text) {
      return this.delete(from, to);
    }
    const $from = resolveInternal(this.schema, this.doc, from);
    const parentName = $from.parent.type ?? "";
    const marks = (this.storedMarks ?? $from.marks()).filter((mark) =>
      this.schema.allowsMark(parentName, mark.type),
    );
    const node: JSONContent =
      marks.length > 0 ? { type: "text", text, marks } : { type: "text", text };
    const result = replaceRangeInDoc(this.schema, this.doc, from, to, [node]);
    this.applyDoc(result.doc);
    this.setSelection(result.endPos);
    return this;
  }

  delete(from: number, to: number): Transaction {
    if (from >= to) {
      return this;
    }
    this.applyDoc(
      fillRequired(
        this.schema,
        deleteRangeInDoc(this.schema, this.doc, from, to),
      ),
    );
    this.setSelection(from);
    return this;
  }

  addMark(from: number, to: number, mark: MarkJSON): Transaction {
    this.applyDoc(addMarkInRange(this.schema, this.doc, from, to, mark));
    return this;
  }

  removeMark(from: number, to: number, markType: string): Transaction {
    this.applyDoc(removeMarkInRange(this.schema, this.doc, from, to, markType));
    return this;
  }

  setStoredMarks(marks: MarkJSON[] | null): Transaction {
    this.storedMarks = marks ? normalizeMarkSet(this.schema, marks) : null;
    return this;
  }

  addStoredMark(mark: MarkJSON): Transaction {
    const current =
      this.storedMarks ??
      resolve(this.schema, this.doc, this.selection.from).marks();
    this.storedMarks = addMarkToSet(this.schema, current, mark);
    return this;
  }

  removeStoredMark(markType: string): Transaction {
    const current =
      this.storedMarks ??
      resolve(this.schema, this.doc, this.selection.from).marks();
    this.storedMarks = current.filter((mark) => mark.type !== markType);
    return this;
  }

  setBlockType(
    from: number,
    to: number,
    type: string,
    attrs?: Attributes,
  ): Transaction {
    this.applyDoc(
      setBlockTypeInRange(this.schema, this.doc, from, to, type, attrs),
    );
    return this;
  }

  setNodeAttributes(pos: number, attrs: Attributes): Transaction {
    this.applyDoc(setNodeAttributesAt(this.schema, this.doc, pos, attrs));
    return this;
  }

  wrap(
    from: number,
    to: number,
    type: string,
    attrs?: Attributes,
  ): Transaction {
    return this.restructure(() =>
      wrapRangeInDoc(this.schema, this.doc, from, to, type, attrs),
    );
  }

  lift(from: number, to: number): Transaction {
    return this.restructure(() =>
      liftRangeInDoc(this.schema, this.doc, from, to),
    );
  }

  /**
   * Apply an arbitrary immutable document transform. Returning null leaves the
   * draft untouched. Text content is assumed unchanged, so the selection is
   * carried across by character index.
   */
  transform(fn: (doc: JSONContent) => JSONContent | null): Transaction {
    const next = fn(this.doc);
    if (next) {
      this.applyDoc(next);
    }
    return this;
  }

  /** Structural change that preserves text: keep the selection on the same characters. */
  private restructure(fn: () => JSONContent | null): Transaction {
    const next = fn();
    if (!next) {
      return this;
    }
    const anchorIndex = textIndexAt(
      this.schema,
      this.doc,
      this.selection.anchor,
    );
    const headIndex = textIndexAt(this.schema, this.doc, this.selection.head);
    this.applyDoc(next);
    this.selection = createSelection(
      nearestTextPosition(
        this.schema,
        next,
        positionAtTextIndex(this.schema, next, anchorIndex),
      ),
      nearestTextPosition(
        this.schema,
        next,
        positionAtTextIndex(this.schema, next, headIndex),
      ),
    );
    return this;
  }

  split(pos: number, depth = 1): Transaction {
    const split = splitAt(this.schema, this.doc, pos, depth);
    if (split) {
      this.applyDoc(split);
      this.setSelection(pos + 2 * depth);
    }
    return this;
  }

  canWrap(from: number, to: number, type: string): boolean {
    const range = blockRange(this.schema, this.doc, from, to);
    if (!range || !this.schema.allowsContent(range.parent.type ?? "", type)) {
      return false;
    }
    const inside = (range.parent.content ?? []).slice(
      range.startIndex,
      range.endIndex,
    );
    if (inside.length === 0) {
      return false;
    }
    return !!this.schema.findWrapping(
      type,
      inside.map((child) => child.type ?? ""),
    );
  }

  canLift(from: number, to: number): boolean {
    return liftRangeInDoc(this.schema, this.doc, from, to) !== null;
  }

  canSplit(pos: number, depth = 1): boolean {
    return splitAt(this.schema, this.doc, pos, depth) !== null;
  }

  setMeta(key: string, value: unknown): Transaction {
    this.metadata.set(key, value);
    return this;
  }

  getMeta(key: string): unknown {
    return this.metadata.get(key);
  }

  resolve(pos: number): ResolvedPosition {
    return resolve(this.schema, this.doc, pos);
  }
}

function normalizeMarkSet(schema: Schema, marks: MarkJSON[]): MarkJSON[] {
  let set: MarkJSON[] = [];
  for (const mark of marks) {
    set = addMarkToSet(schema, set, mark);
  }
  return set;
}

/** Exported for the view: normalize inline content after a DOM resync. */
export { normalizeInline };
