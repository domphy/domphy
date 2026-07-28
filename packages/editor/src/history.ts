/**
 * Snapshot undo/redo. Document trees are immutable, so a snapshot is just a
 * reference — cheap to keep. Changes closer together than `newGroupDelay`
 * collapse into one undo step.
 */

import type { JSONContent, MarkJSON, SelectionRange } from "./types.js";

export interface HistoryEntry {
  doc: JSONContent;
  selection: SelectionRange;
  storedMarks: MarkJSON[] | null;
}

export class History {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private lastRecordedAt = 0;

  constructor(
    private readonly depth = 100,
    private readonly newGroupDelay = 500,
  ) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Push the state that existed *before* a document change.
   *
   * `continuesPrevious` is what the caller knows about the change itself: a run
   * of typing collapses into the open step, while a change of a different kind
   * starts its own even inside the grouping delay.
   */
  record(
    previous: HistoryEntry,
    now = Date.now(),
    continuesPrevious = true,
  ): void {
    this.redoStack = [];
    if (
      continuesPrevious &&
      this.undoStack.length > 0 &&
      now - this.lastRecordedAt < this.newGroupDelay
    ) {
      this.lastRecordedAt = now;
      return;
    }
    this.undoStack.push(previous);
    if (this.undoStack.length > this.depth) {
      this.undoStack.shift();
    }
    this.lastRecordedAt = now;
  }

  undo(current: HistoryEntry): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) {
      return null;
    }
    this.redoStack.push(current);
    this.lastRecordedAt = 0;
    return entry;
  }

  redo(current: HistoryEntry): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) {
      return null;
    }
    this.undoStack.push(current);
    this.lastRecordedAt = 0;
    return entry;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.lastRecordedAt = 0;
  }
}
