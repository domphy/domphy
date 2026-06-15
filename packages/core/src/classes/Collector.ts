import type { Handler } from "../types.js"

// A Collector is the bridge between auto-tracked reads (State.get / RecordState.get
// called WITHOUT an explicit listener) and the existing Notifier subscription model.
//
// When a Collector is active and a reactive source is read, the source subscribes
// the Collector's `handler` to its Notifier exactly as it would any other listener.
// The Notifier hands back a `release` callback through `handler.onSubscribe`; the
// Collector records every release it receives so the whole dependency set can be
// torn down at once on the next re-run (effect/computed) or on dispose. This reuses
// Notifier's subscribe/notify/flush and `_chain` cycle detection — there is no
// parallel reactivity system.
export class Collector {
  // The function the Notifier actually stores as a listener. Invoked (via the
  // Notifier flush) whenever any tracked dependency changes.
  readonly handler: Handler
  // Release callbacks for the dependencies subscribed during the current run.
  private _releases: Set<() => void> = new Set()

  constructor(onDependencyChange: () => void) {
    const handler = (() => onDependencyChange()) as Handler
    // Notifier.addListener calls onSubscribe(release) right after adding the
    // listener. Record the release so we can drop this exact subscription later.
    handler.onSubscribe = (release: () => void) => {
      this._releases.add(release)
    }
    this.handler = handler
  }

  // Release every dependency subscribed since the last reset. Called before a
  // re-run (so stale deps are dropped and only freshly read deps remain) and on
  // dispose (so nothing is left subscribed).
  reset(): void {
    for (const release of this._releases) release()
    this._releases.clear()
  }

  get dependencyCount(): number {
    return this._releases.size
  }
}

// Stack of active collectors. A stack (not a single slot) so nested reactive
// computations compose: a `computed` read inside an `effect` pushes its own
// collector while running, then pops, restoring the effect as the active one.
const COLLECTOR_STACK: Collector[] = []

// Depth of active `untrack` regions. While > 0, reads do NOT register into the
// active collector even though one is on the stack.
let UNTRACK_DEPTH = 0

// The collector that auto-tracked reads should subscribe to right now, or null
// when tracking is suppressed (inside untrack) or no computation is running.
export function activeCollector(): Collector | null {
  if (UNTRACK_DEPTH > 0) return null
  return COLLECTOR_STACK.length ? COLLECTOR_STACK[COLLECTOR_STACK.length - 1] : null
}

// Run `fn` with `collector` active, guaranteeing the stack is restored even if
// `fn` throws.
export function runWithCollector<T>(collector: Collector, fn: () => T): T {
  COLLECTOR_STACK.push(collector)
  try {
    return fn()
  } finally {
    COLLECTOR_STACK.pop()
  }
}

// Run `fn` with tracking suppressed; reads inside register nowhere.
export function runUntracked<T>(fn: () => T): T {
  UNTRACK_DEPTH++
  try {
    return fn()
  } finally {
    UNTRACK_DEPTH--
  }
}
