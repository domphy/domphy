import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { State } from "../src/classes/State.ts"

// Flush all pending microtasks
const flushMicrotasks = () => new Promise<void>(resolve => queueMicrotask(resolve))

describe("Notifier circular dependency detection", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { })
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it("detects direct A → B → A cycle", async () => {
    const a = new State(0, "a")
    const b = new State(0, "b")

    a.addListener((() => { b.set(b.get() + 1) }) as any)
    b.addListener((() => { a.set(a.get() + 1) }) as any)

    a.set(1)
    await flushMicrotasks()
    await flushMicrotasks() // b fires
    await flushMicrotasks() // a fires again → circular detected

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("a → b → a")
    )
  })

  it("detects 3-hop A → B → C → A cycle", async () => {
    const a = new State(0, "a")
    const b = new State(0, "b")
    const c = new State(0, "c")

    a.addListener((() => { b.set(b.get() + 1) }) as any)
    b.addListener((() => { c.set(c.get() + 1) }) as any)
    c.addListener((() => { a.set(a.get() + 1) }) as any)

    a.set(1)
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("a → b → c → a")
    )
  })

  it("does not false-positive on diamond (shared dependency without cycle)", async () => {
    // a → b, a → c, b → d, c → d  (diamond, NOT circular)
    const a = new State(0, "a")
    const b = new State(0, "b")
    const c = new State(0, "c")
    const d = new State(0, "d")

    a.addListener((() => { b.set(b.get() + 1) }) as any)
    a.addListener((() => { c.set(c.get() + 1) }) as any)
    b.addListener((() => { d.set(d.get() + 1) }) as any)
    c.addListener((() => { d.set(d.get() + 1) }) as any)

    a.set(1)
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()

    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("stops propagating after circular detected (no infinite loop)", async () => {
    const a = new State(0, "a")
    const b = new State(0, "b")
    const countA = vi.fn()
    const countB = vi.fn()

    a.addListener((() => { countA(); b.set(b.get() + 1) }) as any)
    b.addListener((() => { countB(); a.set(a.get() + 1) }) as any)

    a.set(1)
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()

    // Should fire once each, not loop forever
    expect(countA).toHaveBeenCalledTimes(1)
    expect(countB).toHaveBeenCalledTimes(1)
  })

  it("allows a listener to converge its own state (self-clamp) without a false circular", async () => {
    const count = new State(0, "count")
    const seen: number[] = []

    count.addListener((() => { if (count.get() > 10) count.set(10) }) as any) // clamp
    count.addListener((() => { seen.push(count.get()) }) as any) // observer

    count.set(15)
    await flushMicrotasks()
    await flushMicrotasks()
    await flushMicrotasks()

    expect(count.get()).toBe(10) // clamp applied and propagated
    expect(seen).toContain(10)
    expect(errorSpy).not.toHaveBeenCalled() // not dropped as a fake cycle
  })

  it("bounds a genuinely diverging self-update instead of looping forever", async () => {
    const n = new State(0, "n")
    n.addListener((() => { n.set(n.get() + 1) }) as any) // never converges

    n.set(1)
    let guard = 0
    while (!errorSpy.mock.calls.length && guard++ < 200) await flushMicrotasks()

    expect(errorSpy).toHaveBeenCalled() // runaway detected and stopped
    expect(n.get()).toBeLessThan(200) // bounded
  })
})
