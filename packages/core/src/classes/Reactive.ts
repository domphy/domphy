import {
  activeCollector,
  Collector,
  runUntracked,
  runWithCollector,
} from "./Collector.js";
import { Notifier, runBatched } from "./Notifier.js";
import type { ValueListener } from "./State.js";

// Derived-reactivity layer built ON TOP of State/RecordState + Notifier. Nothing
// here forks a parallel reactivity system: every dependency is tracked by
// subscribing a Collector's handler through the same Notifier.addListener path a
// plain `state.get(listener)` uses, and every downstream notification goes
// through Notifier.notify (so `_chain` cycle detection still applies).

// ----------------------------------------------------------------------------
// Reaction scheduler
// ----------------------------------------------------------------------------
//
// An effect/computed subscribes its Collector handler to EACH of its
// dependencies' Notifiers. When several dependencies change in one tick (or in
// one `batch`), each dependency Notifier flushes in its own microtask and would
// invoke the handler once per dependency. To re-run a reaction at most ONCE per
// burst, the handler does not run its work inline; it enqueues a deduplicated
// job. A single microtask drains the queue, and jobs enqueued while draining
// (e.g. a downstream computed reacting) are processed in the same drain — so a
// `batch` of writes collapses into a single downstream flush.

// Microtask scheduler with the same `queueMicrotask` fallback as Notifier, for
// older embedded Chromium runtimes that predate it.
const scheduleMicrotask: (callback: () => void) => void =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (callback) => {
        Promise.resolve()
          .then(callback)
          .catch((error) => {
            setTimeout(() => {
              throw error;
            }, 0);
          });
      };

const REACTION_QUEUE: Set<() => void> = new Set();
let reactionDrainScheduled = false;

function scheduleReaction(job: () => void): void {
  REACTION_QUEUE.add(job);
  if (reactionDrainScheduled) return;
  reactionDrainScheduled = true;
  scheduleMicrotask(drainReactions);
}

function drainReactions(): void {
  reactionDrainScheduled = false;
  // Drain in passes: a job may enqueue more jobs (a computed re-running pushes to
  // its downstream computeds). Process until the queue settles.
  while (REACTION_QUEUE.size > 0) {
    const jobs = [...REACTION_QUEUE];
    REACTION_QUEUE.clear();
    for (const job of jobs) job();
  }
}

// ----------------------------------------------------------------------------
// Scopes
// ----------------------------------------------------------------------------

// Disposer registered to a scope. A computed/effect/listener created inside a
// scope's `run` adds its teardown here so `stop()` can release the whole graph
// of a removed subtree in one call.
type Disposer = () => void;

// Stack of active scopes. Nested scopes register into the innermost one, and a
// child scope is itself registered into its parent so stopping the parent stops
// the child too.
const SCOPE_STACK: EffectScope[] = [];

function activeScope(): EffectScope | null {
  return SCOPE_STACK.length ? SCOPE_STACK[SCOPE_STACK.length - 1] : null;
}

function registerDisposer(dispose: Disposer): void {
  const scope = activeScope();
  if (scope) scope._add(dispose);
}

export interface EffectScopeHandle {
  // Run `fn` with this scope active; anything reactive created inside is owned
  // by the scope. Returns whatever `fn` returns.
  run<T>(fn: () => T): T;
  // Dispose everything created inside this scope (and inside nested scopes).
  stop(): void;
}

class EffectScope implements EffectScopeHandle {
  private _disposers: Set<Disposer> = new Set();
  private _stopped = false;

  // Register a teardown owned by this scope. Called by effect/computed/listener
  // creation and by nested-scope creation.
  _add(dispose: Disposer): void {
    if (this._stopped) {
      // The scope is already stopped; tear the new resource down immediately so
      // a late creation cannot leak.
      dispose();
      return;
    }
    this._disposers.add(dispose);
  }

  run<T>(fn: () => T): T {
    SCOPE_STACK.push(this);
    try {
      return fn();
    } finally {
      SCOPE_STACK.pop();
    }
  }

  stop(): void {
    if (this._stopped) return;
    this._stopped = true;
    for (const dispose of this._disposers) dispose();
    this._disposers.clear();
  }
}

// Create an effect scope. Used so a removed subtree can dispose its reactive
// graph in one `stop()` call. Nested scopes are owned by the enclosing scope.
export function effectScope(): EffectScopeHandle {
  const scope = new EffectScope();
  registerDisposer(() => scope.stop());
  return scope;
}

// ----------------------------------------------------------------------------
// Effect
// ----------------------------------------------------------------------------

// Run `fn` immediately, auto-tracking every reactive read inside it, and re-run
// it whenever any tracked dependency changes. Returns a `dispose()` that releases
// all current subscriptions. Each run re-collects dependencies, so reads no
// longer reached (e.g. behind a branch) are dropped.
export function effect(fn: () => void): () => void {
  let disposed = false;
  // `running` guards against an effect whose `fn` writes a state it also reads,
  // which would otherwise re-enter `run` mid-run.
  let running = false;

  // A dependency changed: schedule a single deduplicated re-run. The job is the
  // SAME function reference each time, so the reaction queue's Set collapses
  // notifications from multiple dependencies (and from a batch) into one re-run.
  const job = (): void => {
    if (disposed) return;
    run();
  };
  const collector = new Collector(() => {
    if (disposed) return;
    scheduleReaction(job);
  });

  const run = (): void => {
    if (disposed || running) return;
    running = true;
    // Drop the previous run's dependencies so only deps read on THIS run remain
    // subscribed (stale-dep collection).
    collector.reset();
    try {
      runWithCollector(collector, fn);
    } finally {
      running = false;
    }
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    collector.reset();
    REACTION_QUEUE.delete(job);
  };

  registerDisposer(dispose);
  run(); // initial run is synchronous + immediate
  return dispose;
}

// ----------------------------------------------------------------------------
// Computed
// ----------------------------------------------------------------------------

// Read-only, State-like derived value. Subscribe to it exactly like a State:
// `c.get()` for the current value, `c.get(listener)` to be notified on change,
// and inside an element `(l) => c.get(l)` to bind the DOM.
export interface Computed<T> {
  readonly _isState: true;
  // The computed's own Notifier (downstream subscriptions live here). Exposed,
  // like State._notifier, so subscription/leak inspection works uniformly.
  readonly _notifier: Notifier;
  get(listener?: ValueListener<T>): T;
}

// Lazy + cached derived value. `fn` is evaluated on first read and the result is
// cached; it re-evaluates ONLY after a tracked dependency changes (a dirty flag),
// never on every read. When a dependency changes, the computed recomputes and, if
// the new value differs by `===` from the cached one, notifies its own
// downstream listeners; an identical value short-circuits (no downstream churn).
export function computed<T>(fn: () => T): Computed<T> {
  // The computed publishes its own changes through a private Notifier (the same
  // machinery State uses), so anything subscribing to the computed participates
  // in the normal flush + cycle detection.
  const EVENT = "computed";
  const notifier = new Notifier();

  let cachedValue: T = undefined as unknown as T;
  let dirty = true;
  let hasValue = false;

  // A dependency changed: schedule a single deduplicated reaction. Marking dirty
  // is immediate (so a synchronous read after the change recomputes); the
  // observed-path recompute+notify is deferred to the drain so multiple changing
  // dependencies (and a batch) collapse into one recompute.
  const job = (): void => {
    if (!dirty) return;
    // If nothing is observing this computed, stay lazy — the next read recomputes.
    // If there ARE downstream listeners, recompute now to apply the equality
    // short-circuit and push the new value through this computed's own Notifier.
    if (notifier.listenerCount(EVENT) > 0) recomputeAndNotify();
  };
  const collector = new Collector(() => {
    if (dirty) return;
    dirty = true;
    scheduleReaction(job);
  });

  const recompute = (): void => {
    collector.reset();
    cachedValue = runWithCollector(collector, fn);
    dirty = false;
    hasValue = true;
  };

  const recomputeAndNotify = (): void => {
    const previous = cachedValue;
    const had = hasValue;
    recompute();
    // Equality short-circuit: an unchanged value must not notify downstream.
    if (had && cachedValue === previous) return;
    notifier.notify(EVENT, cachedValue);
  };

  const get = (listener?: ValueListener<T>): T => {
    if (listener) {
      notifier.addListener(EVENT, listener);
    } else {
      // Auto-tracking: reading a computed inside another computed/effect makes
      // the outer computation depend on this one. Reusing State's collector path
      // means a chain of computeds composes through one Notifier graph.
      const outer = activeCollector();
      if (outer) notifier.addListener(EVENT, outer.handler);
    }
    if (dirty) recompute();
    return cachedValue;
  };

  const dispose = (): void => {
    collector.reset();
    REACTION_QUEUE.delete(job);
    notifier._dispose();
  };
  registerDisposer(dispose);

  return { _isState: true, _notifier: notifier, get } as Computed<T>;
}

// ----------------------------------------------------------------------------
// batch / untrack
// ----------------------------------------------------------------------------

// Run `fn`, coalescing all State/RecordState/computed writes inside into a SINGLE
// downstream flush after `fn` returns. Composes with the existing microtask flush
// without double-flushing (see Notifier.runBatched). Returns `fn`'s result.
export function batch<T>(fn: () => T): T {
  return runBatched(fn);
}

// Run `fn` and return its result WITHOUT registering any reads into the currently
// active collector. Useful to read a state inside an effect/computed without
// making it a dependency.
export function untrack<T>(fn: () => T): T {
  return runUntracked(fn);
}
