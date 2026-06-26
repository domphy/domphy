---
title: "Testing"
description: "Unit-test Domphy element trees, reactive state, and patches with Vitest and jsdom."
---

# Testing

## Setup

Domphy UIs are plain objects — most logic can be unit-tested with Vitest without a browser:

```bash
npm install -D vitest jsdom
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
  },
})
```

## Testing state

`State` is a plain class — no mocking required:

```ts
import { describe, expect, it } from "vitest"
import { toState, computed } from "@domphy/core"

describe("counter state", () => {
  it("increments", () => {
    const count = toState(0)
    count.set((n) => n + 1)
    expect(count.get()).toBe(1)
  })

  it("computed re-derives on dependency change", () => {
    const a = toState(2)
    const b = toState(3)
    const sum = computed(() => a.get() + b.get())

    expect(sum.get()).toBe(5)
    a.set(10)
    expect(sum.get()).toBe(13)
  })
})
```

Note: calling `state.get()` without a listener returns the current value without subscribing.

## Testing reactive subscriptions

```ts
import { describe, expect, it, vi } from "vitest"
import { toState } from "@domphy/core"

describe("subscription", () => {
  it("notifies on change", () => {
    const name = toState("Alice")
    const callback = vi.fn()

    name.addListener(callback)
    name.set("Bob")

    expect(callback).toHaveBeenCalledWith("Bob")
  })

  it("does not notify if value unchanged", () => {
    const count = toState(0)
    const callback = vi.fn()

    count.addListener(callback)
    count.set(0)   // same value

    expect(callback).not.toHaveBeenCalled()
  })
})
```

## Testing element trees

Mount an element tree into a real DOM node and assert the output:

```ts
import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { toState } from "@domphy/core"
import { ElementNode } from "@domphy/core"

// Helper to mount a Domphy element and return the DOM node
function mount(element: unknown): HTMLElement {
  const container = document.createElement("div")
  const node = new ElementNode(element)
  container.appendChild(node.domElement)
  return container
}

describe("Counter component", () => {
  it("renders initial count", () => {
    const count = toState(0)
    const Counter = { span: (l) => String(count.get(l)) }
    const dom = mount(Counter)
    expect(dom.querySelector("span")?.textContent).toBe("0")
  })

  it("updates DOM when state changes", async () => {
    const count = toState(0)
    const Counter = { span: (l) => String(count.get(l)) }
    const dom = mount(Counter)

    count.set(5)
    await Promise.resolve()   // flush microtask queue

    expect(dom.querySelector("span")?.textContent).toBe("5")
  })
})
```

## Testing user interactions

Simulate DOM events on mounted elements:

```ts
import { describe, expect, it } from "vitest"
import { toState } from "@domphy/core"
import { ElementNode } from "@domphy/core"

describe("input field", () => {
  it("updates state on input", async () => {
    const value = toState("")
    const Input = {
      input: null,
      type: "text",
      value: (l) => value.get(l),
      onInput: (e: Event) => value.set((e.target as HTMLInputElement).value),
    }

    const container = document.createElement("div")
    const node = new ElementNode(Input)
    container.appendChild(node.domElement)

    const input = container.querySelector("input") as HTMLInputElement
    input.value = "hello"
    input.dispatchEvent(new Event("input"))

    expect(value.get()).toBe("hello")
  })
})
```

## Testing async state

```ts
import { describe, expect, it, vi } from "vitest"
import { toState } from "@domphy/core"

describe("async data loading", () => {
  it("transitions through loading → success", async () => {
    const state = toState<{ data: string | null; loading: boolean }>({
      data: null, loading: false,
    })

    const fetchData = vi.fn().mockResolvedValue("Hello")

    async function load() {
      state.set((s) => ({ ...s, loading: true }))
      const data = await fetchData()
      state.set({ data, loading: false })
    }

    const loadPromise = load()
    expect(state.get().loading).toBe(true)
    expect(state.get().data).toBe(null)

    await loadPromise
    expect(state.get().loading).toBe(false)
    expect(state.get().data).toBe("Hello")
  })
})
```

## Testing patches

```ts
import { describe, expect, it } from "vitest"
import { ElementNode } from "@domphy/core"
import { tooltip } from "./tooltip.js"

describe("tooltip patch", () => {
  it("sets title attribute", () => {
    const el = { span: "hover me", $: [tooltip({ text: "A tooltip" })] }
    const node = new ElementNode(el)
    expect((node.domElement as HTMLSpanElement).title).toBe("A tooltip")
  })
})
```

## Testing CSS output

Check that a Domphy element generates the expected CSS:

```ts
import { describe, expect, it } from "vitest"
import { ElementNode } from "@domphy/core"
import { button } from "@domphy/ui"

describe("button patch CSS", () => {
  it("generates height CSS variable", () => {
    const el = { button: "Click", $: [button()] }
    const node = new ElementNode(el)
    const css = node.generateCSS()
    expect(css).toContain("height")
  })
})
```

## Testing `@domphy/press` pages

The press pipeline exports `renderDoc` which runs entirely in Node — no browser needed:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "@domphy/press"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("docs rendering", () => {
  it("extracts title from H1", async () => {
    const result = await renderDoc("# My Page\n\nContent.", {
      filePath: join(tmpdir(), "test.md"),
      docsDir: tmpdir(),
      repoRoot: tmpdir(),
      highlight: (code) => code,
    })
    expect(result.title).toBe("My Page")
  })
})
```

## Test organization

```
src/
  components/
    Counter.ts
    Counter.test.ts     ← unit test for Counter
  state/
    cart.ts
    cart.test.ts        ← unit test for cart state
tests/
  integration/
    checkout.test.ts    ← end-to-end flow test
```

Keep state tests separate from component tests — state tests are the cheapest and fastest; run them first.
