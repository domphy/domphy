// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createVirtualizer } from "../src/domphy/index"

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createVirtualizer", () => {
  it("reports total size and virtual items from estimates", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 1000,
      estimateSize: () => 32,
    })
    expect(list.getTotalSize()).toBe(1000 * 32)
    expect(Array.isArray(list.getVirtualItems())).toBe(true)
    list.destroy()
  })

  it("updates count and total size via setOptions", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 10,
      estimateSize: () => 50,
    })
    expect(list.getTotalSize()).toBe(500)
    list.setOptions({ count: 20 })
    expect(list.getTotalSize()).toBe(1000)
    list.destroy()
  })

  it("wires a scroll element and exposes a reactive version", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 100,
      estimateSize: () => 20,
    })
    expect(typeof list.version()).toBe("number")

    const el = document.createElement("div")
    document.body.appendChild(el)
    expect(() => list.setScrollElement(el)).not.toThrow()
    expect(() => list.scrollToOffset(100)).not.toThrow()
    expect(() => list.scrollToIndex(50)).not.toThrow()

    list.destroy()
    el.remove()
  })

  it("exposes the underlying virtualizer instance", () => {
    const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: 5,
      estimateSize: () => 10,
    })
    expect(list.virtualizer.options.count).toBe(5)
    expect(typeof list.virtualizer.getVirtualItems).toBe("function")
    list.destroy()
  })
})
