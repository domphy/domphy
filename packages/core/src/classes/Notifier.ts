import type { Handler } from "../types.js";

type ChainEntry = [notifier: Notifier, event: string];

// Shared across all instances to track the flush chain for circular detection.
let _chain: ChainEntry[] = [];

// Microtask scheduler. Older embedded Chromium runtimes (SketchUp 2020 /
// 2021.0 ship CEF 64) predate `queueMicrotask` (added in Chrome 71). A
// resolved Promise's `.then` runs as a microtask in the same checkpoint, so
// it is the standard fallback. The `.catch` mimics `queueMicrotask`'s
// behaviour of surfacing thrown errors to the global error handler rather
// than silently becoming an unhandled-rejection.
export const _microtask: (cb: () => void) => void =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (cb) => {
        Promise.resolve()
          .then(cb)
          .catch((e) => {
            setTimeout(() => {
              throw e;
            }, 0);
          });
      };

// Cap on self-re-notifications within one settle burst. A converging update
// (clamp/normalize) reaches a fixpoint in a pass or two; anything beyond this is
// a genuinely diverging self-feedback loop and is stopped like a cycle.
const SELF_NOTIFY_CAP = 100;

// Batching: while `_batchDepth > 0`, every `notify` records its pending entry as
// usual but does NOT schedule a flush. Notifiers that received writes during the
// batch are collected in `_batchedNotifiers`; when the outermost batch ends they
// are scheduled together, so the whole batch coalesces into a SINGLE microtask
// flush instead of one per write. This composes with the existing per-event
// `_pending` coalescing (repeated writes to the same event still collapse to one
// entry) without ever double-flushing.
let _batchDepth = 0;
let _batchedNotifiers: Set<Notifier> = new Set();

// Every Notifier with a flush scheduled but not yet run. flushSync() drains this
// to apply pending state-change notifications synchronously (see
// flushPendingNotifiers); normal operation still flushes via the microtask.
const _scheduledNotifiers: Set<Notifier> = new Set();

// Run `fn`, deferring all flushes triggered inside it into one flush afterwards.
// Nested batches collapse into the outermost one. Reentrant-safe: the stack is
// restored and the batched set is flushed even if `fn` throws.
export function runBatched<T>(fn: () => T): T {
  _batchDepth++;
  try {
    return fn();
  } finally {
    _batchDepth--;
    if (_batchDepth === 0) {
      const notifiers = _batchedNotifiers;
      _batchedNotifiers = new Set();
      for (const notifier of notifiers) notifier._scheduleFlush();
    }
  }
}

export class Notifier {
  private _listeners: Record<string, Set<Handler>> | null = {};
  private _pending: Map<string, { args: unknown[]; chain: ChainEntry[] }> =
    new Map();
  private _scheduled = false;
  // Args currently being delivered per event (used to detect a self-update fixpoint).
  private _flushing: Map<string, unknown[]> = new Map();
  // Self-re-notification depth in the current settle burst (runaway guard).
  private _selfDepth = 0;

  _dispose(): void {
    if (this._listeners) {
      for (const event in this._listeners) {
        this._listeners[event].clear();
      }
    }
    this._listeners = null;
  }

  addListener(event: string, listener: Handler): () => void {
    if (!this._listeners) return () => {};

    if (typeof event !== "string" || typeof listener !== "function") {
      throw new Error(
        "Event name must be a string, listener must be a function",
      );
    }

    if (!this._listeners[event]) {
      this._listeners[event] = new Set();
    }

    const release = () => this.removeListener(event, listener);

    if (this._listeners[event].has(listener)) return release;

    this._listeners[event].add(listener);
    if (typeof listener.onSubscribe === "function") {
      listener.onSubscribe(release);
    }

    return release;
  }

  removeListener(event: string, listener: Handler): void {
    if (!this._listeners) return;

    const listeners = this._listeners[event];
    if (listeners && listeners.has(listener)) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        delete this._listeners[event];
      }
    }
  }

  // Number of listeners subscribed to an event. Used by `computed` to stay lazy:
  // an unobserved computed only marks itself dirty on a dependency change and
  // defers recomputation until the next read.
  listenerCount(event: string): number {
    return this._listeners?.[event]?.size ?? 0;
  }

  notify(event: string, ...args: unknown[]): void {
    if (!this._listeners) return;
    if (!this._listeners[event]) return;

    // A listener that re-sets its OWN state mid-flush shows up as [this,event] at
    // the TOP of the chain. That is a converging self-update (clamp/normalize),
    // not a cross-state cycle — let it re-propagate with a fresh chain. A deeper
    // match (intervening notifiers) is a real cycle and is still rejected.
    const top = _chain.length ? _chain[_chain.length - 1] : null;
    const selfReentry = !!top && top[0] === this && top[1] === event;

    if (selfReentry) {
      const inflight = this._flushing.get(event);
      // Same value as the one being delivered → fixpoint reached, stop quietly.
      if (inflight && inflight[0] === args[0]) return;
      if (this._selfDepth >= SELF_NOTIFY_CAP) {
        console.error(
          `[Domphy] Runaway self-update on "${event}" — stopped after ${SELF_NOTIFY_CAP} iterations`,
        );
        return;
      }
      this._selfDepth++;
      this._pending.set(event, { args, chain: [] });
    } else {
      if (this._isCircular(event)) return;
      this._pending.set(event, { args, chain: [..._chain] });
    }

    // While batching, defer scheduling: just remember this notifier has pending
    // work so the outermost batch can flush it once. Outside a batch, schedule
    // the microtask flush immediately as before.
    if (_batchDepth > 0) {
      _batchedNotifiers.add(this);
    } else {
      this._scheduleFlush();
    }
  }

  // Schedule the microtask flush if one is not already pending. Idempotent, so a
  // batch flushing many notifiers (and concurrent direct notifies) never queues
  // two flushes for the same instance.
  _scheduleFlush(): void {
    if (this._scheduled) return;
    this._scheduled = true;
    _scheduledNotifiers.add(this);
    _microtask(() => this._flushAll());
  }

  private _isCircular(event: string): boolean {
    const idx = _chain.findIndex(([n, e]) => n === this && e === event);
    if (idx === -1) return false;

    const names = [..._chain.slice(idx).map(([, e]) => e), event];
    console.error(
      `[Domphy] Circular dependency detected:\n  ${names.join(" → ")}`,
    );
    return true;
  }

  _flushAll(): void {
    this._scheduled = false;
    _scheduledNotifiers.delete(this);
    const pending = this._pending;
    this._pending = new Map();

    for (const [event, { args, chain }] of pending) {
      _chain = chain;
      this._flush(event, args);
    }
    _chain = [];
    // Burst settled (no self-update re-queued anything) → reset the runaway guard.
    if (this._pending.size === 0) this._selfDepth = 0;
  }

  private _flush(event: string, args: unknown[]): void {
    if (!this._listeners) return;
    const listeners = this._listeners[event];
    if (!listeners) return;

    _chain.push([this, event]);
    this._flushing.set(event, args);

    for (const listener of [...listeners]) {
      if (!listeners.has(listener)) continue;
      try {
        listener(...args);
      } catch (e) {
        console.error(e);
      }
    }

    this._flushing.delete(event);
    _chain.pop();
  }
}

// True when any Notifier has a flush scheduled but not yet run. flushSync() uses
// this to decide whether more synchronous draining is needed.
export function hasPendingNotifiers(): boolean {
  return _scheduledNotifiers.size > 0;
}

// Synchronously run every scheduled Notifier flush, including notifiers
// scheduled while draining (a listener that writes another state re-schedules
// its own Notifier). Driven by flushSync() alongside the reaction queue.
export function flushPendingNotifiers(): void {
  let guard = 0;
  while (_scheduledNotifiers.size > 0) {
    if (guard++ > 10000) {
      console.error("[Domphy] flushSync: notifier queue did not settle");
      break;
    }
    const notifiers = [..._scheduledNotifiers];
    _scheduledNotifiers.clear();
    for (const notifier of notifiers) notifier._flushAll();
  }
}
