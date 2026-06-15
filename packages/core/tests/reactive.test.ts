// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { State } from "../src/classes/State.ts"
import { RecordState } from "../src/classes/RecordState.ts"
import { ElementNode } from "../src/classes/ElementNode.ts"
import type { DomphyElement } from "../src/types.ts"
import { toState } from "../src/utils.ts"
import { computed, effect, effectScope, batch, untrack } from "../src/classes/Reactive.ts"

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r))
}

// Flush several microtask turns so multi-hop propagation (a chain of computeds,
// each notifying through its own Notifier microtask) fully settles. Mirrors the
// repeated-flush style of the existing notifier-circular tests.
async function settle(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) await flush()
}

// Sum of all listener-set sizes on a State's (or computed's) internal Notifier.
function listenerCount(source: any): number {
  const listeners = source?._notifier?._listeners
  if (!listeners) return 0
  let total = 0
  for (const key in listeners) total += listeners[key].size
  return total
}

function mountApp(App: DomphyElement) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const node = new ElementNode(App)
  node.render(host)
  return { host, node }
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("computed: laziness + caching", () => {
  it("does not run fn until first read", () => {
    const a = new State(1, "a")
    const spy = vi.fn(() => a.get() * 2)
    const c = computed(spy)
    expect(spy).not.toHaveBeenCalled() // lazy: untouched until read
    expect(c.get()).toBe(2)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("caches: repeated reads do not re-run fn while deps are unchanged", () => {
    const a = new State(3, "a")
    const spy = vi.fn(() => a.get() + 1)
    const c = computed(spy)
    expect(c.get()).toBe(4)
    expect(c.get()).toBe(4)
    expect(c.get()).toBe(4)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("recomputes only after a tracked dependency changes", async () => {
    const a = new State(1, "a")
    const spy = vi.fn(() => a.get() * 10)
    const c = computed(spy)
    expect(c.get()).toBe(10)
    expect(spy).toHaveBeenCalledTimes(1)

    a.set(2)
    await flush()
    expect(c.get()).toBe(20)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it("stays lazy when unobserved: a dep change only marks dirty, recompute waits for read", async () => {
    const a = new State(1, "a")
    const spy = vi.fn(() => a.get() + 100)
    const c = computed(spy)
    expect(c.get()).toBe(101) // first read computes
    expect(spy).toHaveBeenCalledTimes(1)

    a.set(5) // no downstream listener → should NOT recompute eagerly
    await flush()
    expect(spy).toHaveBeenCalledTimes(1)

    expect(c.get()).toBe(105) // recomputes lazily on read
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

describe("computed: equality short-circuit", () => {
  it("does not notify downstream when recomputed value === previous", async () => {
    const a = new State(2, "a")
    const c = computed(() => a.get() % 2) // 2%2 = 0
    const downstream = vi.fn()
    c.get(downstream as any) // subscribe; current value 0
    expect(c.get()).toBe(0)

    a.set(4) // 4%2 still 0 → no downstream notify
    await settle()
    expect(downstream).not.toHaveBeenCalled()

    a.set(3) // 3%2 = 1 → value changed, notify
    await settle()
    expect(downstream).toHaveBeenCalledTimes(1)
    expect(downstream).toHaveBeenCalledWith(1)
  })
})

describe("computed: composition (computed reading computed)", () => {
  it("propagates through a chain of computeds", async () => {
    const a = new State(2, "a")
    const doubled = computed(() => a.get() * 2)
    const plusOne = computed(() => doubled.get() + 1)
    const downstream = vi.fn()
    plusOne.get(downstream as any)
    expect(plusOne.get()).toBe(5)

    a.set(10)
    await settle()
    expect(plusOne.get()).toBe(21)
    expect(downstream).toHaveBeenCalledTimes(1)
    expect(downstream).toHaveBeenCalledWith(21)
  })
})

describe("effect: immediate run + reactive re-run", () => {
  it("runs immediately and re-runs when a dep changes", async () => {
    const a = new State(1, "a")
    const seen: number[] = []
    effect(() => seen.push(a.get()))
    expect(seen).toEqual([1]) // immediate

    a.set(2)
    await flush()
    expect(seen).toEqual([1, 2])
  })

  it("tracks RecordState reads per key", async () => {
    const record = new RecordState({ x: 1, y: 100 })
    const seen: number[] = []
    effect(() => seen.push(record.get("x")))
    expect(seen).toEqual([1])

    record.set("y", 200) // not tracked → no re-run
    await flush()
    expect(seen).toEqual([1])

    record.set("x", 9) // tracked
    await flush()
    expect(seen).toEqual([1, 9])
  })
})

describe("effect: dependency re-collection (drops stale deps)", () => {
  it("stops reacting to a dep no longer read after a branch flip", async () => {
    const useA = new State(true, "useA")
    const a = new State("a1", "a")
    const b = new State("b1", "b")
    const seen: string[] = []

    effect(() => {
      seen.push(useA.get() ? a.get() : b.get())
    })
    expect(seen).toEqual(["a1"])

    a.set("a2")
    await flush()
    expect(seen).toEqual(["a1", "a2"])

    useA.set(false) // now reads b, drops a
    await flush()
    expect(seen).toEqual(["a1", "a2", "b1"])

    a.set("a3") // a no longer a dep → no re-run
    await flush()
    expect(seen).toEqual(["a1", "a2", "b1"])

    b.set("b2") // b now a dep → re-run
    await flush()
    expect(seen).toEqual(["a1", "a2", "b1", "b2"])
  })
})

describe("effect: dispose", () => {
  it("dispose() stops re-runs and releases subscriptions", async () => {
    const a = new State(1, "a")
    const seen: number[] = []
    const dispose = effect(() => seen.push(a.get()))
    expect(listenerCount(a)).toBe(1)

    a.set(2)
    await flush()
    expect(seen).toEqual([1, 2])

    dispose()
    expect(listenerCount(a)).toBe(0) // no leak

    a.set(3)
    await flush()
    expect(seen).toEqual([1, 2]) // no further runs
  })
})

describe("untrack", () => {
  it("reads inside untrack do not register as dependencies", async () => {
    const a = new State(1, "a")
    const b = new State(10, "b")
    const seen: number[] = []
    effect(() => {
      const tracked = a.get()
      const ignored = untrack(() => b.get())
      seen.push(tracked + ignored)
    })
    expect(seen).toEqual([11])

    b.set(20) // b read under untrack → no re-run
    await flush()
    expect(seen).toEqual([11])
    expect(listenerCount(b)).toBe(0)

    a.set(2) // a tracked → re-run, reads latest b
    await flush()
    expect(seen).toEqual([11, 22])
  })

  it("returns the inner result", () => {
    const a = new State(5, "a")
    expect(untrack(() => a.get() + 1)).toBe(6)
  })
})

describe("batch", () => {
  it("coalesces multiple writes into a single downstream flush", async () => {
    const a = new State(0, "a")
    const b = new State(0, "b")
    const runs = vi.fn()
    effect(() => {
      a.get()
      b.get()
      runs()
    })
    expect(runs).toHaveBeenCalledTimes(1) // initial

    batch(() => {
      a.set(1)
      b.set(2)
      a.set(3)
    })
    await flush()
    expect(runs).toHaveBeenCalledTimes(2) // exactly one re-run for the whole batch
    expect(a.get()).toBe(3)
    expect(b.get()).toBe(2)
  })

  it("returns fn result and composes with nested batches", async () => {
    const a = new State(0, "a")
    const runs = vi.fn()
    effect(() => { a.get(); runs() })
    expect(runs).toHaveBeenCalledTimes(1)

    const result = batch(() => {
      a.set(1)
      batch(() => a.set(2))
      a.set(3)
      return "done"
    })
    expect(result).toBe("done")
    await flush()
    expect(runs).toHaveBeenCalledTimes(2) // nested collapses into outer batch
  })
})

describe("effectScope", () => {
  it("stop() disposes all effects/computeds created inside run()", async () => {
    const a = new State(1, "a")
    const seenEffect: number[] = []
    const scope = effectScope()
    let c: any
    scope.run(() => {
      effect(() => seenEffect.push(a.get()))
      c = computed(() => a.get() * 2)
    })
    c.get() // observe the computed
    expect(seenEffect).toEqual([1])
    expect(listenerCount(a)).toBeGreaterThan(0)

    scope.stop()
    expect(listenerCount(a)).toBe(0) // every subscription released at once

    a.set(2)
    await flush()
    expect(seenEffect).toEqual([1]) // effect no longer runs
  })

  it("disposes nested scopes too", async () => {
    const a = new State(1, "a")
    const seenOuter: number[] = []
    const seenInner: number[] = []
    const outer = effectScope()
    outer.run(() => {
      effect(() => seenOuter.push(a.get()))
      const inner = effectScope()
      inner.run(() => {
        effect(() => seenInner.push(a.get()))
      })
    })
    expect(seenOuter).toEqual([1])
    expect(seenInner).toEqual([1])

    outer.stop() // must tear down the nested scope's effect too
    expect(listenerCount(a)).toBe(0)

    a.set(2)
    await flush()
    expect(seenOuter).toEqual([1])
    expect(seenInner).toEqual([1])
  })
})

describe("backward-compat: explicit-listener and no-collector reads unchanged", () => {
  it("get(listener) still subscribes the explicit listener even inside an effect", async () => {
    const a = new State(1, "a")
    const explicit = vi.fn()
    effect(() => {
      // Explicit listener path must be untouched: subscribes `explicit`, NOT the
      // active collector, for this particular read.
      a.get(explicit as any)
    })
    a.set(2)
    await flush()
    expect(explicit).toHaveBeenCalledWith(2)
  })

  it("plain get() outside any collector registers nothing", () => {
    const a = new State(1, "a")
    a.get()
    a.get()
    expect(listenerCount(a)).toBe(0)
  })
})

describe("computed in the DOM: (l) => c.get(l) updates the element", () => {
  it("re-renders text when the computed's dependency changes", async () => {
    const count = toState(2, "domCount")
    const doubled = computed(() => count.get() * 2)
    const App = {
      div: (l: any) => String(doubled.get(l)),
    } as DomphyElement

    const { host } = mountApp(App)
    expect(host.querySelector("div")!.textContent).toBe("4")

    count.set(5)
    await settle() // computed reaction + Notifier flush + DOM listener span turns
    expect(host.querySelector("div")!.textContent).toBe("10")
  })

  it("releases the computed subscription when the element subtree is removed", async () => {
    const count = toState(1, "leakCount")
    const show = toState(true, "leakShow")
    const doubled = computed(() => count.get() * 2)
    const App = {
      div: (l: any) =>
        show.get(l) ? [{ span: (l2: any) => String(doubled.get(l2)) }] : [],
    } as DomphyElement

    mountApp(App)
    expect(listenerCount(doubled)).toBe(1)

    show.set(false)
    await flush()
    expect(listenerCount(doubled)).toBe(0) // DOM listener released on teardown
  })
})
